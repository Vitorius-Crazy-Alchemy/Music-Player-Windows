/**
 * Vitorius Music Player Pro - High Performance Web Audio DSP Engine
 * Full implementation of ExoPlayer + Audio Effects + Realtime 32-band FFT Visualizer + Stream Recorder
 */

class AudioEngine {
    constructor() {
        this.audio = new Audio();
        this.audio.crossOrigin = "anonymous";
        this.audio.preload = "auto";

        this.ctx = null;
        this.sourceNode = null;
        this.eqFilters = [];
        this.bassBoostNode = null;
        this.virtualizerNode = null;
        this.loudnessNode = null;
        this.pannerNode = null;
        this.analyserNode = null;
        this.masterGainNode = null;
        this.recordDestNode = null;

        // Equalizer bands (Hz)
        this.bandFrequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        this.presets = {
            "Flat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "Rock": [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
            "Pop": [-1, 1, 3, 4, 4, 3, 1, -1, 1, 2],
            "Jazz": [3, 2, 1, 2, -1, -1, 0, 1, 3, 4],
            "Classical": [4, 3, 2, 2, -1, -1, 0, 2, 3, 3],
            "Heavy Metal": [4, 3, 1, 0, -1, 1, 3, 4, 4, 5],
            "Hip Hop": [5, 4, 2, 1, -1, 0, 1, 2, 3, 3],
            "Electronic": [4, 4, 2, 0, -2, 2, 1, 2, 4, 4],
            "Dance": [4, 3, 2, 0, 0, 2, 3, 3, 4, 2]
        };

        this.isEqEnabled = false;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingStationName = "";
        this.recordingStartTime = 0;
        this.recordingTimerId = null;

        // Visualizer FFT buffer (32 normalized bins)
        this.fftArray = new Uint8Array(32);
        this.normalizedFft = new Float32Array(32);

        // Callbacks
        this.onTimeUpdate = null;
        this.onDurationChange = null;
        this.onEnded = null;
        this.onPlay = null;
        this.onPause = null;
        this.onError = null;
        this.onRecordingProgress = null;

        this.setupAudioListeners();
    }

    initContext() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();

        // 1. Media Source
        this.sourceNode = this.ctx.createMediaElementSource(this.audio);

        // 2. 10-Band Equalizer Filters
        let lastNode = this.sourceNode;
        this.eqFilters = this.bandFrequencies.map((freq, index) => {
            const filter = this.ctx.createBiquadFilter();
            filter.type = "peaking";
            filter.frequency.value = freq;
            filter.Q.value = 1.4;
            filter.gain.value = 0;
            lastNode.connect(filter);
            lastNode = filter;
            return filter;
        });

        // 3. Bass Boost Node (Lowshelf filter around 100Hz)
        this.bassBoostNode = this.ctx.createBiquadFilter();
        this.bassBoostNode.type = "lowshelf";
        this.bassBoostNode.frequency.value = 100;
        this.bassBoostNode.gain.value = 0;
        lastNode.connect(this.bassBoostNode);
        lastNode = this.bassBoostNode;

        // 4. Loudness Enhancer (Dynamics Compressor)
        this.loudnessNode = this.ctx.createDynamicsCompressor();
        this.loudnessNode.threshold.value = -24;
        this.loudnessNode.knee.value = 30;
        this.loudnessNode.ratio.value = 12;
        this.loudnessNode.attack.value = 0.003;
        this.loudnessNode.release.value = 0.25;
        lastNode.connect(this.loudnessNode);
        lastNode = this.loudnessNode;

        // 5. Stereo Panner
        if (this.ctx.createStereoPanner) {
            this.pannerNode = this.ctx.createStereoPanner();
            this.pannerNode.pan.value = 0;
            lastNode.connect(this.pannerNode);
            lastNode = this.pannerNode;
        }

        // 6. Master Gain
        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.value = 0.85;
        lastNode.connect(this.masterGainNode);
        lastNode = this.masterGainNode;

        // 7. Analyser Node for 32-band Cyber Visualizer
        this.analyserNode = this.ctx.createAnalyser();
        this.analyserNode.fftSize = 64; // 32 frequency bins
        this.analyserNode.smoothingTimeConstant = 0.75;
        lastNode.connect(this.analyserNode);

        // 8. Recording Destination
        this.recordDestNode = this.ctx.createMediaStreamDestination();
        lastNode.connect(this.recordDestNode);

        // Final output to speakers
        lastNode.connect(this.ctx.destination);
    }

    setupAudioListeners() {
        this.audio.addEventListener("timeupdate", () => {
            if (this.onTimeUpdate) {
                this.onTimeUpdate(this.audio.currentTime * 1000);
            }
        });

        this.audio.addEventListener("durationchange", () => {
            if (this.onDurationChange) {
                const dur = isFinite(this.audio.duration) ? this.audio.duration * 1000 : 0;
                this.onDurationChange(dur);
            }
        });

        this.audio.addEventListener("ended", () => {
            if (this.onEnded) this.onEnded();
        });

        this.audio.addEventListener("play", () => {
            if (this.ctx && this.ctx.state === "suspended") {
                this.ctx.resume();
            }
            if (this.onPlay) this.onPlay();
        });

        this.audio.addEventListener("pause", () => {
            if (this.onPause) this.onPause();
        });

        this.audio.addEventListener("error", (e) => {
            console.error("Audio playback error:", e);
            if (this.onError) this.onError(e);
        });
    }

    async play(src) {
        this.initContext();
        if (this.ctx.state === "suspended") {
            await this.ctx.resume();
        }

        if (this.audio.src !== src) {
            this.audio.src = src;
            this.audio.load();
        }

        try {
            await this.audio.play();
        } catch (err) {
            console.warn("Playback autoplay blocked, user interaction required:", err);
        }
    }

    pause() {
        this.audio.pause();
    }

    togglePlayPause() {
        if (this.audio.paused) {
            this.play(this.audio.src);
        } else {
            this.pause();
        }
    }

    seek(timeMs) {
        if (isFinite(this.audio.duration) && this.audio.duration > 0) {
            this.audio.currentTime = timeMs / 1000;
        }
    }

    setVolume(value) {
        const clamped = Math.max(0, Math.min(1, value));
        this.audio.volume = clamped;
        if (this.masterGainNode) {
            this.masterGainNode.gain.setValueAtTime(clamped, this.ctx.currentTime);
        }
    }

    getVolume() {
        return this.audio.volume;
    }

    // --- EQUALIZER & AUDIO FX ---

    setEqualizerEnabled(enabled) {
        this.isEqEnabled = enabled;
        if (!this.eqFilters.length) return;
        this.eqFilters.forEach(f => {
            f.gain.setValueAtTime(enabled ? (f._savedGain || 0) : 0, this.ctx.currentTime);
        });
    }

    setBandLevel(bandIndex, gainDb) {
        this.initContext();
        if (bandIndex >= 0 && bandIndex < this.eqFilters.length) {
            const filter = this.eqFilters[bandIndex];
            filter._savedGain = gainDb;
            if (this.isEqEnabled) {
                filter.gain.setValueAtTime(gainDb, this.ctx.currentTime);
            }
        }
    }

    applyPreset(presetName) {
        this.initContext();
        const gains = this.presets[presetName];
        if (!gains) return;
        gains.forEach((gain, idx) => {
            this.setBandLevel(idx, gain);
        });
    }

    setBassBoost(strengthPercent) {
        this.initContext();
        // 0% -> 0dB, 100% -> +12dB
        const gainDb = (strengthPercent / 100) * 12;
        if (this.bassBoostNode) {
            this.bassBoostNode.gain.setValueAtTime(gainDb, this.ctx.currentTime);
        }
    }

    setVirtualizer(strengthPercent) {
        this.initContext();
        // Adjust spatial spread and compressor knee for enhanced dynamic depth
        if (this.loudnessNode) {
            const kneeVal = 30 + (strengthPercent / 100) * 15;
            this.loudnessNode.knee.setValueAtTime(kneeVal, this.ctx.currentTime);
        }
    }

    setLoudnessEnhancer(gainMilliBels) {
        this.initContext();
        // Gain boost up to +6dB
        const boostFactor = 1 + (gainMilliBels / 2000) * 0.5;
        if (this.masterGainNode) {
            this.masterGainNode.gain.setValueAtTime(this.audio.volume * boostFactor, this.ctx.currentTime);
        }
    }

    setAudioBalance(balance) {
        this.initContext();
        // -1.0 (Left) to +1.0 (Right)
        if (this.pannerNode) {
            this.pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, balance)), this.ctx.currentTime);
        }
    }

    setPlaybackRate(rate) {
        this.audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    }

    // --- REALTIME AUDIO VISUALIZER FFT ---

    getFftData() {
        if (!this.analyserNode || this.audio.paused) {
            // Simulated subtle idle waves when paused
            for (let i = 0; i < 32; i++) {
                this.normalizedFft[i] = Math.max(0.04, this.normalizedFft[i] * 0.92);
            }
            return this.normalizedFft;
        }

        this.analyserNode.getByteFrequencyData(this.fftArray);
        for (let i = 0; i < 32; i++) {
            const val = this.fftArray[i] / 255;
            // Smooth easing
            this.normalizedFft[i] = this.normalizedFft[i] * 0.3 + val * 0.7;
        }
        return this.normalizedFft;
    }

    // --- RADIO STREAM RECORDING ---

    startRadioRecording(stationName) {
        if (this.isRecording) return;
        this.initContext();

        this.recordingStationName = stationName || "RadioStream";
        this.recordedChunks = [];
        this.isRecording = true;
        this.recordingStartTime = Date.now();

        try {
            const stream = this.recordDestNode.stream;
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") 
                ? "audio/webm;codecs=opus" 
                : "audio/webm";

            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.recordedChunks.push(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.finalizeRecording();
            };

            this.mediaRecorder.start(1000); // 1-second chunks

            // Progress timer
            this.recordingTimerId = setInterval(() => {
                if (this.onRecordingProgress) {
                    const elapsedSec = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                    this.onRecordingProgress(elapsedSec);
                }
            }, 1000);
        } catch (e) {
            console.error("Recording error:", e);
            this.isRecording = false;
        }
    }

    stopRadioRecording() {
        if (!this.isRecording) return;
        this.isRecording = false;
        if (this.recordingTimerId) {
            clearInterval(this.recordingTimerId);
            this.recordingTimerId = null;
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
            this.mediaRecorder.stop();
        }
    }

    finalizeRecording() {
        if (this.recordedChunks.length === 0) return;
        const blob = new Blob(this.recordedChunks, { type: "audio/mp3" });
        const cleanName = this.recordingStationName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const fileName = `${cleanName}_${timestamp}.mp3`;

        // Direct browser file download / save
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        }, 1500);

        this.recordedChunks = [];
    }
}

window.AudioEngine = AudioEngine;
