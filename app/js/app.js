/**
 * Vitorius Music Player Pro - Main Controller & ViewModel (Windows Desktop)
 * Mirrors Android MainActivity.kt & MusicViewModel.kt
 */

class VitoriusApp {
    constructor() {
        this.audio = new AudioEngine();
        this.storage = StorageManager;
        this.radio = RadioClient;
        this.lyrics = LyricsHelper;

        // Application State
        this.allSongs = [];
        this.albums = [];
        this.artists = [];
        this.folders = [];

        this.currentSong = null;
        this.currentQueue = [];
        this.originalQueue = [];
        this.isPlaying = false;
        this.currentPosition = 0;
        this.duration = 0;
        this.volume = 0.85;

        this.currentNavTab = "library"; // library, radio, playlists, favorites
        this.currentLibSubTab = "tracks"; // tracks, albums, artists, folders
        this.currentRadioSubTab = "my-stations"; // my-stations, explore

        this.myRadioStations = [];
        this.onlineRadioStations = [];
        this.playlists = [];
        this.selectedPlaylist = null;
        this.playlistSongs = [];
        this.favorites = new Set();

        this.currentLyricsList = [];
        this.sleepTimerSeconds = null;
        this.sleepTimerInterval = null;

        this.settings = this.storage.getSettings();
        this.repeatMode = this.settings.repeatMode || "SEQUENTIAL";
        this.isShuffle = this.settings.shuffleEnabled || false;

        this.init();
    }

    async init() {
        await this.storage.init();
        this.setupAudioCallbacks();
        this.bindUiEvents();
        this.setupKeyboardShortcuts();
        this.startVisualizerLoop();

        // Load persisted state
        await this.loadRadioStations();
        await this.loadPlaylists();
        await this.loadFavorites();
        this.applySavedSettings();

        // Check for last playback state
        const lastPlayback = this.storage.getSavedPlaybackState();
        if (lastPlayback && lastPlayback.song) {
            this.setTrackInfo(lastPlayback.song);
            this.currentPosition = lastPlayback.position || 0;
            this.updateSeekbar();
        }

        // Render initial view
        this.renderCurrentView();
    }

    setupAudioCallbacks() {
        this.audio.onTimeUpdate = (timeMs) => {
            this.currentPosition = timeMs;
            this.updateSeekbar();
            this.updateLyricsActiveLine(timeMs);
            if (this.currentSong) {
                this.storage.savePlaybackState(this.currentSong, timeMs);
            }
        };

        this.audio.onDurationChange = (durMs) => {
            this.duration = durMs;
            this.updateSeekbar();
        };

        this.audio.onPlay = () => {
            this.isPlaying = true;
            this.updatePlayPauseButtons();
        };

        this.audio.onPause = () => {
            this.isPlaying = false;
            this.updatePlayPauseButtons();
        };

        this.audio.onEnded = () => {
            this.handleTrackCompletion();
        };

        this.audio.onRecordingProgress = (seconds) => {
            const el = document.getElementById("recordTimerDisplay");
            if (el) el.textContent = this.formatTime(seconds * 1000);
        };
    }

    applySavedSettings() {
        this.audio.setVolume(this.settings.volume);
        this.updateVolumeUi(this.settings.volume);

        if (this.settings.equalizerEnabled) {
            this.audio.setEqualizerEnabled(true);
            if (this.settings.equalizerPreset && this.settings.equalizerPreset !== "Custom") {
                this.audio.applyPreset(this.settings.equalizerPreset);
            }
        }
        if (this.settings.bassBoost) this.audio.setBassBoost(this.settings.bassBoost);
        if (this.settings.virtualizer) this.audio.setVirtualizer(this.settings.virtualizer);
        if (this.settings.loudnessEnhancer) this.audio.setLoudnessEnhancer(this.settings.loudnessEnhancer);
        if (this.settings.audioBalance) this.audio.setAudioBalance(this.settings.audioBalance);
        if (this.settings.playbackSpeed) this.audio.setPlaybackRate(this.settings.playbackSpeed);
    }

    // --- LOCAL MUSIC SCANNING ---

    async openFolderPicker() {
        try {
            if (window.showDirectoryPicker) {
                const dirHandle = await window.showDirectoryPicker();
                this.scanDirectoryHandle(dirHandle);
            } else {
                document.getElementById("folderInput").click();
            }
        } catch (e) {
            console.log("Folder picker cancelled or unsupported:", e);
        }
    }

    async scanDirectoryHandle(dirHandle, currentPath = "") {
        const foundSongs = [];
        const lrcMap = new Map();

        async function readDir(handle, path) {
            for await (const entry of handle.values()) {
                if (entry.kind === "file") {
                    const ext = entry.name.split(".").pop().toLowerCase();
                    if (["mp3", "flac", "wav", "ogg", "m4a", "aac", "opus"].includes(ext)) {
                        const file = await entry.getFile();
                        const song = {
                            id: Math.random().toString(36).substring(2, 9),
                            title: entry.name.replace(/\.[^/.]+$/, ""),
                            artist: "Local Artist",
                            duration: 0,
                            uri: URL.createObjectURL(file),
                            file: file,
                            folderPath: path || handle.name,
                            folderName: handle.name || "Music",
                            album: "Unknown Album"
                        };
                        foundSongs.push(song);
                    } else if (ext === "lrc") {
                        const file = await entry.getFile();
                        const text = await file.text();
                        const base = entry.name.replace(/\.lrc$/i, "").toLowerCase();
                        lrcMap.set(base, text);
                    }
                } else if (entry.kind === "directory") {
                    await readDir(entry, `${path}/${entry.name}`);
                }
            }
        }

        await readDir(dirHandle, dirHandle.name);
        this.processImportedSongs(foundSongs, lrcMap);
    }

    handleFileInputChange(e) {
        const files = Array.from(e.target.files);
        const songs = [];
        const lrcMap = new Map();

        files.forEach(file => {
            const ext = file.name.split(".").pop().toLowerCase();
            if (["mp3", "flac", "wav", "ogg", "m4a", "aac", "opus"].includes(ext)) {
                songs.push({
                    id: Math.random().toString(36).substring(2, 9),
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: "Local Artist",
                    duration: 0,
                    uri: URL.createObjectURL(file),
                    file: file,
                    folderPath: file.webkitRelativePath ? file.webkitRelativePath.split("/")[0] : "Music",
                    folderName: file.webkitRelativePath ? file.webkitRelativePath.split("/")[0] : "Music",
                    album: "Unknown Album"
                });
            } else if (ext === "lrc") {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base = file.name.replace(/\.lrc$/i, "").toLowerCase();
                    lrcMap.set(base, ev.target.result);
                };
                reader.readAsText(file);
            }
        });

        this.processImportedSongs(songs, lrcMap);
    }

    processImportedSongs(songs, lrcMap) {
        if (!songs.length) return;
        this.allSongs = songs;
        this.lrcMap = lrcMap || new Map();

        // Group into Albums, Artists, Folders
        const albumMap = new Map();
        const artistMap = new Map();
        const folderMap = new Map();

        songs.forEach(song => {
            // Album
            if (!albumMap.has(song.album)) albumMap.set(song.album, []);
            albumMap.get(song.album).push(song);

            // Artist
            if (!artistMap.has(song.artist)) artistMap.set(song.artist, []);
            artistMap.get(song.artist).push(song);

            // Folder
            if (!folderMap.has(song.folderName)) folderMap.set(song.folderName, []);
            folderMap.get(song.folderName).push(song);
        });

        this.albums = Array.from(albumMap.entries()).map(([name, sList]) => ({ name, artist: sList[0].artist, songs: sList }));
        this.artists = Array.from(artistMap.entries()).map(([name, sList]) => ({ name, songs: sList }));
        this.folders = Array.from(folderMap.entries()).map(([name, sList]) => ({ name, path: sList[0].folderPath, songs: sList }));

        this.renderCurrentView();
    }

    // --- PLAYBACK OPERATIONS ---

    playSong(song, queue = null) {
        if (!song) return;
        this.currentSong = song;

        if (queue && queue.length) {
            this.originalQueue = [...queue];
            if (this.isShuffle) {
                const shuffled = [...queue].filter(s => s !== song);
                shuffled.sort(() => Math.random() - 0.5);
                this.currentQueue = [song, ...shuffled];
            } else {
                this.currentQueue = [...queue];
            }
        } else if (!this.currentQueue.some(s => s.uri === song.uri)) {
            this.currentQueue.push(song);
            this.originalQueue.push(song);
        }

        this.setTrackInfo(song);
        this.loadLyricsForSong(song);
        this.audio.play(song.uri);
    }

    playRadio(station) {
        const song = {
            id: -1,
            title: station.name,
            artist: station.country ? `${station.country} • Live Stream` : "Live Stream",
            duration: 0,
            uri: station.url,
            folderPath: "WEB",
            folderName: station.name,
            album: station.format ? `${station.format} ${station.bitrate}k` : "Live Radio",
            isRadio: true
        };
        this.playSong(song, [song]);
    }

    togglePlayPause() {
        if (!this.currentSong && this.allSongs.length) {
            this.playSong(this.allSongs[0], this.allSongs);
            return;
        }
        this.audio.togglePlayPause();
    }

    next() {
        if (!this.currentQueue.length) return;
        const curIdx = this.currentQueue.findIndex(s => s.uri === this.currentSong?.uri);
        const nextIdx = (curIdx + 1) % this.currentQueue.length;

        if (nextIdx === 0 && curIdx === this.currentQueue.length - 1) {
            if (this.repeatMode === "SEQUENTIAL" || this.repeatMode === "STOP_AFTER_QUEUE") {
                this.audio.pause();
                return;
            }
        }
        this.playSong(this.currentQueue[nextIdx]);
    }

    previous() {
        if (!this.currentQueue.length) return;
        const curIdx = this.currentQueue.findIndex(s => s.uri === this.currentSong?.uri);
        const prevIdx = curIdx <= 0 ? this.currentQueue.length - 1 : curIdx - 1;
        this.playSong(this.currentQueue[prevIdx]);
    }

    handleTrackCompletion() {
        if (this.currentSong?.folderPath === "WEB") return;

        switch (this.repeatMode) {
            case "REPEAT_ONE":
                this.audio.seek(0);
                this.audio.play(this.currentSong.uri);
                break;
            case "STOP_AFTER_TRACK":
                this.audio.pause();
                break;
            case "SEQUENTIAL":
            case "REPEAT_ALL":
            case "STOP_AFTER_QUEUE":
            default:
                this.next();
                break;
        }
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.storage.saveSettings({ shuffleEnabled: this.isShuffle });

        const btn = document.getElementById("shuffleBtn");
        const modalBtn = document.getElementById("modalShuffleBtn");
        [btn, modalBtn].forEach(el => {
            if (el) el.classList.toggle("active", this.isShuffle);
        });

        if (this.isShuffle && this.currentSong) {
            const rest = this.originalQueue.filter(s => s.uri !== this.currentSong.uri);
            rest.sort(() => Math.random() - 0.5);
            this.currentQueue = [this.currentSong, ...rest];
        } else {
            this.currentQueue = [...this.originalQueue];
        }
    }

    cycleRepeatMode() {
        const modes = ["SEQUENTIAL", "REPEAT_ALL", "REPEAT_ONE", "STOP_AFTER_TRACK"];
        const nextIdx = (modes.indexOf(this.repeatMode) + 1) % modes.length;
        this.repeatMode = modes[nextIdx];
        this.storage.saveSettings({ repeatMode: this.repeatMode });

        const icons = {
            "SEQUENTIAL": "bi-repeat",
            "REPEAT_ALL": "bi-repeat",
            "REPEAT_ONE": "bi-repeat-1",
            "STOP_AFTER_TRACK": "bi-slash-circle"
        };

        const btns = [document.getElementById("repeatBtn"), document.getElementById("modalRepeatBtn")];
        btns.forEach(b => {
            if (b) {
                b.className = `icon-btn ${this.repeatMode !== "SEQUENTIAL" ? "active" : ""}`;
                b.innerHTML = `<i class="bi ${icons[this.repeatMode]}"></i>`;
            }
        });
    }

    // --- UI UPDATES ---

    setTrackInfo(song) {
        const elements = {
            title: [document.getElementById("barTrackTitle"), document.getElementById("modalTrackTitle")],
            artist: [document.getElementById("barTrackArtist"), document.getElementById("modalTrackArtist")],
            favBtn: [document.getElementById("modalFavBtn")]
        };

        elements.title.forEach(el => { if (el) el.textContent = song.title; });
        elements.artist.forEach(el => { if (el) el.textContent = song.artist; });

        this.updateFavoriteButton(song);

        // Radio badge toggle
        const badge = document.getElementById("nowPlayingBadge");
        if (badge) {
            badge.textContent = song.folderPath === "WEB" ? "LIVE GLOBAL RADIO" : "NOW PLAYING";
        }

        // Recording button visibility
        const recordBtn = document.getElementById("modalRecordRadioBtn");
        if (recordBtn) {
            recordBtn.style.display = song.folderPath === "WEB" ? "flex" : "none";
        }
    }

    updatePlayPauseButtons() {
        const iconClass = this.isPlaying ? "bi-pause-fill" : "bi-play-fill";
        const barBtn = document.getElementById("barPlayToggle");
        const modalBtn = document.getElementById("modalPlayToggle");
        if (barBtn) barBtn.innerHTML = `<i class="bi ${iconClass}"></i>`;
        if (modalBtn) modalBtn.innerHTML = `<i class="bi ${iconClass}"></i>`;
    }

    updateSeekbar() {
        const curEl = document.getElementById("currentTimeLabel");
        const durEl = document.getElementById("durationTimeLabel");
        const slider = document.getElementById("barSeekSlider");
        const modalSlider = document.getElementById("modalSeekSlider");

        if (curEl) curEl.textContent = this.formatTime(this.currentPosition);
        if (durEl) durEl.textContent = this.formatTime(this.duration);

        const val = this.duration > 0 ? (this.currentPosition / this.duration) * 100 : 0;
        if (slider) slider.value = val;
        if (modalSlider) modalSlider.value = val;
    }

    updateVolumeUi(vol) {
        const slider = document.getElementById("barVolumeSlider");
        if (slider) slider.value = vol * 100;
    }

    // --- FAVORITES & PLAYLISTS ---

    async loadFavorites() {
        const list = await this.storage.getAllFavorites();
        this.favorites = new Set(list.map(f => f.uri));
    }

    async toggleFavorite(item) {
        if (!item) return;
        const uri = item.uri;
        const isFav = await this.storage.toggleFavorite({
            uri: uri,
            title: item.title,
            artist: item.artist,
            isRadio: item.folderPath === "WEB" || item.isRadio === true
        });

        if (isFav) this.favorites.add(uri);
        else this.favorites.delete(uri);

        this.updateFavoriteButton(item);
        if (this.currentNavTab === "favorites") {
            this.renderFavoritesView();
        }
    }

    updateFavoriteButton(song) {
        const btn = document.getElementById("modalFavBtn");
        if (btn && song) {
            const isFav = this.favorites.has(song.uri);
            btn.classList.toggle("active", isFav);
            btn.innerHTML = `<i class="bi ${isFav ? "bi-heart-fill" : "bi-heart"}"></i>`;
        }
    }

    async loadPlaylists() {
        this.playlists = await this.storage.getAllPlaylists();
    }

    async createPlaylist(name) {
        if (!name || !name.trim()) return;
        await this.storage.createPlaylist(name);
        await this.loadPlaylists();
        if (this.currentNavTab === "playlists") this.renderPlaylistsView();
    }

    async deletePlaylist(id) {
        await this.storage.deletePlaylist(id);
        await this.loadPlaylists();
        if (this.currentNavTab === "playlists") this.renderPlaylistsView();
    }

    // --- RADIO OPERATIONS ---

    async loadRadioStations() {
        const customs = await this.storage.getCustomRadioStations();
        this.myRadioStations = [...this.radio.defaultStations, ...customs];
        this.onlineRadioStations = await this.radio.getTopStations(40);
    }

    async searchOnlineRadio(query) {
        const loader = document.getElementById("radioSearchSpinner");
        if (loader) loader.style.display = "block";
        this.onlineRadioStations = await this.radio.searchStations(query);
        if (loader) loader.style.display = "none";
        this.renderExploreRadioView();
    }

    async filterRadioByTag(tag) {
        const loader = document.getElementById("radioSearchSpinner");
        if (loader) loader.style.display = "block";
        this.onlineRadioStations = await this.radio.getStationsByTag(tag);
        if (loader) loader.style.display = "none";
        this.renderExploreRadioView();
    }

    toggleRadioRecording() {
        if (this.audio.isRecording) {
            this.audio.stopRadioRecording();
            const pill = document.getElementById("recordStatusPill");
            if (pill) pill.style.display = "none";
        } else {
            const name = this.currentSong?.title || "LiveRadio";
            this.audio.startRadioRecording(name);
            const pill = document.getElementById("recordStatusPill");
            if (pill) pill.style.display = "flex";
        }
    }

    // --- LYRICS ---

    loadLyricsForSong(song) {
        if (!song || song.folderPath === "WEB") {
            this.currentLyricsList = [];
            this.renderLyrics();
            return;
        }

        const base = song.title.toLowerCase();
        let content = null;
        if (this.lrcMap) {
            for (const [key, text] of this.lrcMap.entries()) {
                if (key === base || key.includes(base) || base.includes(key)) {
                    content = text;
                    break;
                }
            }
        }

        this.currentLyricsList = content ? this.lyrics.parseLrc(content) : [];
        this.renderLyrics();
    }

    renderLyrics() {
        const container = document.getElementById("lyricsContainer");
        if (!container) return;

        if (!this.currentLyricsList.length) {
            container.innerHTML = `<div class="empty-state" style="height:100%"><i class="bi bi-music-note-beamed"></i><p>No synchronized lyrics (.lrc) loaded</p></div>`;
            return;
        }

        container.innerHTML = this.currentLyricsList.map((line, idx) => 
            `<div class="lyric-line" id="lyric_${idx}">${line.text}</div>`
        ).join("");
    }

    updateLyricsActiveLine(currentMs) {
        if (!this.currentLyricsList.length) return;
        const activeIdx = this.currentLyricsList.findLastIndex(l => l.timeMs <= currentMs);
        if (activeIdx !== -1) {
            document.querySelectorAll(".lyric-line").forEach((el, i) => {
                const isActive = i === activeIdx;
                el.classList.toggle("active", isActive);
                if (isActive) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            });
        }
    }

    // --- SLEEP TIMER ---

    startSleepTimer(minutes) {
        this.cancelSleepTimer();
        if (minutes <= 0) return;

        this.sleepTimerSeconds = minutes * 60;
        const badge = document.getElementById("sleepTimerBadge");
        if (badge) badge.style.display = "inline-flex";

        this.sleepTimerInterval = setInterval(() => {
            this.sleepTimerSeconds--;
            if (badge) {
                const m = Math.floor(this.sleepTimerSeconds / 60);
                const s = this.sleepTimerSeconds % 60;
                badge.textContent = `💤 ${m}:${s < 10 ? '0' : ''}${s}`;
            }

            // Smooth fade in last 30s
            if (this.sleepTimerSeconds <= 30) {
                this.audio.setVolume(this.audio.getVolume() * 0.95);
            }

            if (this.sleepTimerSeconds <= 0) {
                this.cancelSleepTimer();
                this.audio.pause();
            }
        }, 1000);
    }

    cancelSleepTimer() {
        if (this.sleepTimerInterval) {
            clearInterval(this.sleepTimerInterval);
            this.sleepTimerInterval = null;
        }
        this.sleepTimerSeconds = null;
        const badge = document.getElementById("sleepTimerBadge");
        if (badge) badge.style.display = "none";
    }

    // --- REALTIME 32-BAND VISUALIZER CANVAS ---

    startVisualizerLoop() {
        const canvas = document.getElementById("visualizerCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const render = () => {
            requestAnimationFrame(render);
            const data = this.audio.getFftData();
            const width = canvas.width = canvas.clientWidth * window.devicePixelRatio;
            const height = canvas.height = canvas.clientHeight * window.devicePixelRatio;

            ctx.clearRect(0, 0, width, height);

            const count = 32;
            const spacing = 4 * window.devicePixelRatio;
            const barWidth = Math.max(2, (width - (spacing * (count - 1))) / count);

            for (let i = 0; i < count; i++) {
                const mag = Math.max(0.04, data[i]);
                const barHeight = mag * height;
                const x = i * (barWidth + spacing);
                const y = height - barHeight;

                const grad = ctx.createLinearGradient(0, y, 0, height);
                grad.addColorStop(0, "#FF4081"); // Cyber Pink peak
                grad.addColorStop(1, "#00E5FF"); // Neon Cyan base

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, 2 * window.devicePixelRatio);
                ctx.fill();
            }
        };

        requestAnimationFrame(render);
    }

    // --- UI EVENT BINDINGS & SHORTCUTS ---

    bindUiEvents() {
        // Window Controls
        document.getElementById("winMinBtn")?.addEventListener("click", () => {
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage("minimize");
            }
        });
        document.getElementById("winMaxBtn")?.addEventListener("click", () => {
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage("maximize");
            }
        });
        document.getElementById("winCloseBtn")?.addEventListener("click", () => {
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage("close");
            } else {
                window.close();
            }
        });

        // Navigation Tabs
        document.querySelectorAll(".nav-item").forEach(item => {
            item.addEventListener("click", (e) => {
                document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
                item.classList.add("active");
                this.currentNavTab = item.dataset.tab;
                this.renderCurrentView();
            });
        });

        // Subtabs
        document.querySelectorAll(".subtab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".subtab-btn").forEach(el => el.classList.remove("active"));
                btn.classList.add("active");
                this.currentLibSubTab = btn.dataset.subtab;
                this.renderCurrentView();
            });
        });

        // Playback Bar Controls
        document.getElementById("barPlayToggle")?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.togglePlayPause();
        });
        document.getElementById("barPrevBtn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.previous();
        });
        document.getElementById("barNextBtn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.next();
        });
        document.getElementById("barSeekSlider")?.addEventListener("input", (e) => {
            const targetMs = (parseFloat(e.target.value) / 100) * this.duration;
            this.audio.seek(targetMs);
        });
        document.getElementById("barVolumeSlider")?.addEventListener("input", (e) => {
            const vol = parseFloat(e.target.value) / 100;
            this.audio.setVolume(vol);
            this.storage.saveSettings({ volume: vol });
        });

        // Click Bar to Open Full Now Playing Modal
        document.getElementById("playbackBar")?.addEventListener("click", (e) => {
            if (!e.target.closest("button") && !e.target.closest("input")) {
                this.openModal("nowPlayingModal");
            }
        });

        // Search Bar
        const searchInput = document.getElementById("searchInput");
        searchInput?.addEventListener("input", (e) => {
            this.searchQuery = e.target.value.toLowerCase().trim();
            this.renderCurrentView();
        });

        // Drag and Drop audio files into window
        window.addEventListener("dragover", (e) => e.preventDefault());
        window.addEventListener("drop", (e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
                this.handleFileInputChange({ target: { files: e.dataTransfer.files } });
            }
        });

        // Folder Scan button
        document.getElementById("addFolderBtn")?.addEventListener("click", () => this.openFolderPicker());
        document.getElementById("folderInput")?.addEventListener("change", (e) => this.handleFileInputChange(e));

        // Equalizer Modal Trigger
        document.getElementById("equalizerBtn")?.addEventListener("click", () => this.openModal("equalizerModal"));
        document.getElementById("modalEqBtn")?.addEventListener("click", () => {
            this.closeModal("nowPlayingModal");
            this.openModal("equalizerModal");
        });

        // Settings Modal Trigger
        document.getElementById("settingsBtn")?.addEventListener("click", () => this.openModal("settingsModal"));

        // Lyrics View Toggle
        document.getElementById("modalLyricsBtn")?.addEventListener("click", () => {
            const art = document.getElementById("nowPlayingArtSection");
            const lyr = document.getElementById("lyricsContainer");
            if (art && lyr) {
                const showLyrics = lyr.style.display !== "flex";
                lyr.style.display = showLyrics ? "flex" : "none";
                art.style.display = showLyrics ? "none" : "flex";
            }
        });

        // Radio Recording Button
        document.getElementById("modalRecordRadioBtn")?.addEventListener("click", () => this.toggleRadioRecording());

        // Favorite Toggle Button
        document.getElementById("modalFavBtn")?.addEventListener("click", () => {
            if (this.currentSong) this.toggleFavorite(this.currentSong);
        });

        // Equalizer UI Controls
        this.bindEqualizerControls();
    }

    bindEqualizerControls() {
        const toggle = document.getElementById("eqPowerToggle");
        toggle?.addEventListener("change", (e) => {
            this.audio.setEqualizerEnabled(e.target.checked);
            this.storage.saveSettings({ equalizerEnabled: e.target.checked });
        });

        const presetSelect = document.getElementById("eqPresetSelect");
        presetSelect?.addEventListener("change", (e) => {
            const val = e.target.value;
            this.audio.applyPreset(val);
            this.storage.saveSettings({ equalizerPreset: val });
            this.updateEqualizerSliderValues();
        });

        // Band Sliders
        for (let i = 0; i < 10; i++) {
            const slider = document.getElementById(`eqSlider_${i}`);
            slider?.addEventListener("input", (e) => {
                const db = parseFloat(e.target.value);
                this.audio.setBandLevel(i, db);
                if (presetSelect) presetSelect.value = "Custom";
            });
        }

        // Bass Boost, Virtualizer, Loudness, Balance
        document.getElementById("bassBoostSlider")?.addEventListener("input", (e) => {
            const v = parseInt(e.target.value, 10);
            this.audio.setBassBoost(v);
            this.storage.saveSettings({ bassBoost: v });
        });
        document.getElementById("virtualizerSlider")?.addEventListener("input", (e) => {
            const v = parseInt(e.target.value, 10);
            this.audio.setVirtualizer(v);
            this.storage.saveSettings({ virtualizer: v });
        });
        document.getElementById("loudnessSlider")?.addEventListener("input", (e) => {
            const v = parseInt(e.target.value, 10);
            this.audio.setLoudnessEnhancer(v);
            this.storage.saveSettings({ loudnessEnhancer: v });
        });
        document.getElementById("balanceSlider")?.addEventListener("input", (e) => {
            const v = parseFloat(e.target.value);
            this.audio.setAudioBalance(v);
            this.storage.saveSettings({ audioBalance: v });
        });
        document.getElementById("speedSlider")?.addEventListener("input", (e) => {
            const v = parseFloat(e.target.value);
            this.audio.setPlaybackRate(v);
            this.storage.saveSettings({ playbackSpeed: v });
        });

        document.getElementById("resetFxBtn")?.addEventListener("click", () => {
            this.audio.applyPreset("Flat");
            this.audio.setBassBoost(0);
            this.audio.setVirtualizer(0);
            this.audio.setLoudnessEnhancer(0);
            this.audio.setAudioBalance(0);
            this.audio.setPlaybackRate(1.0);
            this.storage.saveSettings({
                equalizerPreset: "Flat",
                bassBoost: 0,
                virtualizer: 0,
                loudnessEnhancer: 0,
                audioBalance: 0,
                playbackSpeed: 1.0
            });
            this.updateEqualizerSliderValues();
        });
    }

    updateEqualizerSliderValues() {
        const filters = this.audio.eqFilters;
        filters.forEach((f, idx) => {
            const slider = document.getElementById(`eqSlider_${idx}`);
            if (slider) slider.value = f.gain.value;
        });
    }

    setupKeyboardShortcuts() {
        window.addEventListener("keydown", (e) => {
            if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    this.audio.seek(Math.max(0, this.currentPosition - 5000));
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    this.audio.seek(Math.min(this.duration, this.currentPosition + 5000));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    this.audio.setVolume(Math.min(1, this.audio.getVolume() + 0.05));
                    this.updateVolumeUi(this.audio.getVolume());
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    this.audio.setVolume(Math.max(0, this.audio.getVolume() - 0.05));
                    this.updateVolumeUi(this.audio.getVolume());
                    break;
                case "KeyM":
                    this.audio.setVolume(this.audio.getVolume() > 0 ? 0 : 0.85);
                    this.updateVolumeUi(this.audio.getVolume());
                    break;
                case "KeyS":
                    this.toggleShuffle();
                    break;
                case "KeyR":
                    this.cycleRepeatMode();
                    break;
                case "KeyE":
                    this.openModal("equalizerModal");
                    break;
                case "Escape":
                    this.closeAllModals();
                    break;
            }
        });
    }

    // --- MODALS ---

    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add("open");
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove("open");
    }

    closeAllModals() {
        document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("open"));
    }

    // --- VIEW RENDERING ---

    renderCurrentView() {
        const container = document.getElementById("viewsContainer");
        const subtabs = document.getElementById("subtabsBar");
        if (!container) return;

        if (this.currentNavTab === "library") {
            if (subtabs) subtabs.style.display = "flex";
            switch (this.currentLibSubTab) {
                case "tracks": this.renderTracksView(); break;
                case "albums": this.renderAlbumsView(); break;
                case "artists": this.renderArtistsView(); break;
                case "folders": this.renderFoldersView(); break;
            }
        } else if (this.currentNavTab === "radio") {
            if (subtabs) subtabs.style.display = "none";
            this.renderRadioView();
        } else if (this.currentNavTab === "playlists") {
            if (subtabs) subtabs.style.display = "none";
            this.renderPlaylistsView();
        } else if (this.currentNavTab === "favorites") {
            if (subtabs) subtabs.style.display = "none";
            this.renderFavoritesView();
        }
    }

    renderTracksView() {
        const container = document.getElementById("viewsContainer");
        let list = this.allSongs;
        if (this.searchQuery) {
            list = list.filter(s => s.title.toLowerCase().includes(this.searchQuery) || s.artist.toLowerCase().includes(this.searchQuery));
        }

        if (!list.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-folder-music"></i>
                    <h2>NO AUDIO FILES LOADED</h2>
                    <p>Click "Add Music Folder" or drag & drop MP3, FLAC, WAV files directly into this window.</p>
                    <button class="action-btn primary" onclick="vitoriusApp.openFolderPicker()"><i class="bi bi-folder-plus"></i> Add Music Folder</button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="track-list">
                ${list.map((song, idx) => `
                    <div class="track-row ${this.currentSong?.uri === song.uri ? 'playing' : ''}" onclick="vitoriusApp.playSong(vitoriusApp.allSongs[${idx}], vitoriusApp.allSongs)">
                        <div class="track-art"><i class="bi bi-music-note"></i></div>
                        <div class="track-meta">
                            <div class="track-title">${song.title}</div>
                            <div class="track-artist">${song.artist} • ${song.album}</div>
                        </div>
                        <div class="track-actions">
                            <button class="icon-btn fav ${this.favorites.has(song.uri) ? 'active' : ''}" onclick="event.stopPropagation(); vitoriusApp.toggleFavorite(vitoriusApp.allSongs[${idx}])">
                                <i class="bi ${this.favorites.has(song.uri) ? 'bi-heart-fill' : 'bi-heart'}"></i>
                            </button>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    renderAlbumsView() {
        const container = document.getElementById("viewsContainer");
        if (!this.albums.length) {
            this.renderTracksView();
            return;
        }
        container.innerHTML = `
            <div class="cards-grid">
                ${this.albums.map((album, idx) => `
                    <div class="album-card" onclick="vitoriusApp.playSong(vitoriusApp.albums[${idx}].songs[0], vitoriusApp.albums[${idx}].songs)">
                        <div class="album-card-cover"><i class="bi bi-disc"></i></div>
                        <div class="album-card-info">
                            <div class="album-card-title">${album.name}</div>
                            <div class="album-card-sub">${album.artist}</div>
                            <div class="album-card-badge">${album.songs.length} TRACKS</div>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    renderArtistsView() {
        const container = document.getElementById("viewsContainer");
        if (!this.artists.length) {
            this.renderTracksView();
            return;
        }
        container.innerHTML = `
            <div class="cards-grid">
                ${this.artists.map((artist, idx) => `
                    <div class="album-card" onclick="vitoriusApp.playSong(vitoriusApp.artists[${idx}].songs[0], vitoriusApp.artists[${idx}].songs)">
                        <div class="album-card-cover"><i class="bi bi-person-circle"></i></div>
                        <div class="album-card-info">
                            <div class="album-card-title">${artist.name}</div>
                            <div class="album-card-badge">${artist.songs.length} SONGS</div>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    renderFoldersView() {
        const container = document.getElementById("viewsContainer");
        if (!this.folders.length) {
            this.renderTracksView();
            return;
        }
        container.innerHTML = `
            <div class="cards-grid">
                ${this.folders.map((folder, idx) => `
                    <div class="album-card" onclick="vitoriusApp.playSong(vitoriusApp.folders[${idx}].songs[0], vitoriusApp.folders[${idx}].songs)">
                        <div class="album-card-cover"><i class="bi bi-folder-fill"></i></div>
                        <div class="album-card-info">
                            <div class="album-card-title">${folder.name}</div>
                            <div class="album-card-sub">${folder.path}</div>
                            <div class="album-card-badge">${folder.songs.length} TRACKS</div>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    renderRadioView() {
        const container = document.getElementById("viewsContainer");
        const popularTags = ["Rock", "Jazz", "Electronic", "Classical", "Pop", "Chill", "Ambient", "News"];

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:16px;">
                <div style="display:flex; gap:12px; align-items:center;">
                    <div class="search-box" style="flex:1;">
                        <i class="bi bi-search"></i>
                        <input type="text" placeholder="Search 40,000+ stations worldwide..." onchange="vitoriusApp.searchOnlineRadio(this.value)">
                    </div>
                    <button class="action-btn" onclick="vitoriusApp.openAddRadioModal()"><i class="bi bi-plus-lg"></i> Custom Station</button>
                </div>

                <div class="tag-chips">
                    ${popularTags.map(tag => `<div class="tag-chip" onclick="vitoriusApp.filterRadioByTag('${tag}')">${tag}</div>`).join("")}
                </div>

                <h3 style="font-size:14px; font-weight:800; color:var(--neon-cyan); letter-spacing:1px;">CURATED STATIONS</h3>
                <div class="cards-grid">
                    ${this.myRadioStations.map(st => `
                        <div class="radio-card" onclick="vitoriusApp.playRadio({name:'${st.name.replace(/'/g, "\\'")}', url:'${st.url}', country:'${st.country}', format:'${st.format}', bitrate:${st.bitrate}})">
                            <div class="radio-icon"><i class="bi bi-broadcast-pin"></i></div>
                            <div style="flex:1; min-width:0;">
                                <div style="font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${st.name}</div>
                                <div style="font-size:11px; color:var(--text-dim);">${st.country} • ${st.format} ${st.bitrate}k</div>
                            </div>
                            <button class="icon-btn fav ${this.favorites.has(st.url) ? 'active' : ''}" onclick="event.stopPropagation(); vitoriusApp.toggleFavorite({uri:'${st.url}', title:'${st.name.replace(/'/g, "\\'")}', artist:'Live Radio', isRadio:true})">
                                <i class="bi ${this.favorites.has(st.url) ? 'bi-heart-fill' : 'bi-heart'}"></i>
                            </button>
                        </div>
                    `).join("")}
                </div>

                <h3 style="font-size:14px; font-weight:800; color:var(--neon-cyan); letter-spacing:1px; margin-top:20px;">EXPLORE GLOBAL (ONLINE)</h3>
                <div id="radioSearchSpinner" style="display:none; text-align:center; padding:20px; color:var(--neon-cyan);">Connecting to Radio Browser Network...</div>
                <div class="cards-grid" id="exploreRadioGrid">
                    ${this.onlineRadioStations.map(st => `
                        <div class="radio-card" onclick="vitoriusApp.playRadio({name:'${st.name.replace(/'/g, "\\'")}', url:'${st.url}', country:'${st.country}', format:'${st.format}', bitrate:${st.bitrate}})">
                            <div class="radio-icon"><i class="bi bi-globe"></i></div>
                            <div style="flex:1; min-width:0;">
                                <div style="font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${st.name}</div>
                                <div style="font-size:11px; color:var(--text-dim);">${st.country} • ${st.format} ${st.bitrate}k</div>
                            </div>
                            <button class="icon-btn" title="Add to My Stations" onclick="event.stopPropagation(); vitoriusApp.saveToMyStations({name:'${st.name.replace(/'/g, "\\'")}', url:'${st.url}', country:'${st.country}', format:'${st.format}', bitrate:${st.bitrate}})">
                                <i class="bi bi-bookmark-plus"></i>
                            </button>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    renderExploreRadioView() {
        const grid = document.getElementById("exploreRadioGrid");
        if (!grid) return;
        grid.innerHTML = this.onlineRadioStations.map(st => `
            <div class="radio-card" onclick="vitoriusApp.playRadio({name:'${st.name.replace(/'/g, "\\'")}', url:'${st.url}', country:'${st.country}', format:'${st.format}', bitrate:${st.bitrate}})">
                <div class="radio-icon"><i class="bi bi-globe"></i></div>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${st.name}</div>
                    <div style="font-size:11px; color:var(--text-dim);">${st.country} • ${st.format} ${st.bitrate}k</div>
                </div>
                <button class="icon-btn" title="Add to My Stations" onclick="event.stopPropagation(); vitoriusApp.saveToMyStations({name:'${st.name.replace(/'/g, "\\'")}', url:'${st.url}', country:'${st.country}', format:'${st.format}', bitrate:${st.bitrate}})">
                    <i class="bi bi-bookmark-plus"></i>
                </button>
            </div>
        `).join("");
    }

    async saveToMyStations(st) {
        await this.storage.addCustomRadioStation(st);
        await this.loadRadioStations();
        this.renderRadioView();
    }

    renderPlaylistsView() {
        const container = document.getElementById("viewsContainer");
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="font-size:16px; font-weight:800; color:var(--neon-cyan); letter-spacing:1px;">MY PLAYLISTS</h3>
                <button class="action-btn primary" onclick="vitoriusApp.promptNewPlaylist()"><i class="bi bi-plus-lg"></i> New Playlist</button>
            </div>
            ${!this.playlists.length ? `
                <div class="empty-state">
                    <i class="bi bi-collection-play"></i>
                    <h2>NO PLAYLISTS CREATED YET</h2>
                    <p>Organize your favorite music into custom playlists.</p>
                </div>
            ` : `
                <div class="cards-grid">
                    ${this.playlists.map(pl => `
                        <div class="album-card" onclick="vitoriusApp.openPlaylistDetail(${pl.id}, '${pl.name.replace(/'/g, "\\'")}')">
                            <div class="album-card-cover"><i class="bi bi-music-note-list"></i></div>
                            <div class="album-card-info" style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div class="album-card-title">${pl.name}</div>
                                    <div class="album-card-badge">CUSTOM PLAYLIST</div>
                                </div>
                                <button class="icon-btn" onclick="event.stopPropagation(); vitoriusApp.deletePlaylist(${pl.id})" style="color:var(--error)"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `}
        `;
    }

    async openPlaylistDetail(playlistId, name) {
        const songs = await this.storage.getSongsForPlaylist(playlistId);
        const container = document.getElementById("viewsContainer");
        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                <button class="action-btn" onclick="vitoriusApp.renderPlaylistsView()"><i class="bi bi-arrow-left"></i> Back</button>
                <h3 style="font-size:16px; font-weight:800; color:var(--neon-cyan);">${name} (${songs.length} Tracks)</h3>
            </div>
            ${!songs.length ? `<div class="empty-state"><p>This playlist is empty. Add songs from your Library!</p></div>` : `
                <div class="track-list">
                    ${songs.map((song, idx) => `
                        <div class="track-row" onclick="vitoriusApp.playSong(songs[${idx}], songs)">
                            <div class="track-art"><i class="bi bi-music-note"></i></div>
                            <div class="track-meta">
                                <div class="track-title">${song.title}</div>
                                <div class="track-artist">${song.artist}</div>
                            </div>
                            <button class="icon-btn" onclick="event.stopPropagation(); vitoriusApp.storage.removeSongFromPlaylist(${playlistId}, ${song.id}); vitoriusApp.openPlaylistDetail(${playlistId}, '${name}')"><i class="bi bi-x-lg"></i></button>
                        </div>
                    `).join("")}
                </div>
            `}
        `;
    }

    promptNewPlaylist() {
        const name = prompt("Enter playlist name:");
        if (name && name.trim()) {
            this.createPlaylist(name.trim());
        }
    }

    renderFavoritesView() {
        const container = document.getElementById("viewsContainer");
        const favSongs = this.allSongs.filter(s => this.favorites.has(s.uri));
        const favRadios = this.myRadioStations.filter(s => this.favorites.has(s.url));

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:20px;">
                <h3 style="font-size:16px; font-weight:800; color:var(--neon-cyan); letter-spacing:1px;">FAVORITE SONGS (${favSongs.length})</h3>
                ${!favSongs.length ? `<p style="color:var(--text-dim)">No favorite songs yet. Click the heart icon on any song!</p>` : `
                    <div class="track-list">
                        ${favSongs.map((song, idx) => `
                            <div class="track-row" onclick="vitoriusApp.playSong(favSongs[${idx}], favSongs)">
                                <div class="track-art"><i class="bi bi-heart-fill" style="color:var(--cyber-pink)"></i></div>
                                <div class="track-meta">
                                    <div class="track-title">${song.title}</div>
                                    <div class="track-artist">${song.artist}</div>
                                </div>
                                <button class="icon-btn fav active" onclick="event.stopPropagation(); vitoriusApp.toggleFavorite(song)"><i class="bi bi-heart-fill"></i></button>
                            </div>
                        `).join("")}
                    </div>
                `}

                <h3 style="font-size:16px; font-weight:800; color:var(--neon-cyan); letter-spacing:1px; margin-top:20px;">FAVORITE RADIO STATIONS (${favRadios.length})</h3>
                ${!favRadios.length ? `<p style="color:var(--text-dim)">No favorite radio stations yet. Click the heart icon on any radio station!</p>` : `
                    <div class="cards-grid">
                        ${favRadios.map(st => `
                            <div class="radio-card" onclick="vitoriusApp.playRadio({name:'${st.name.replace(/'/g, "\\'")}', url:'${st.url}', country:'${st.country}', format:'${st.format}', bitrate:${st.bitrate}})">
                                <div class="radio-icon"><i class="bi bi-broadcast"></i></div>
                                <div style="flex:1; min-width:0;">
                                    <div style="font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${st.name}</div>
                                    <div style="font-size:11px; color:var(--text-dim);">${st.country} • ${st.format} ${st.bitrate}k</div>
                                </div>
                                <button class="icon-btn fav active" onclick="event.stopPropagation(); vitoriusApp.toggleFavorite({uri:'${st.url}', title:'${st.name.replace(/'/g, "\\'")}', artist:'Live Radio', isRadio:true})">
                                    <i class="bi bi-heart-fill"></i>
                                </button>
                            </div>
                        `).join("")}
                    </div>
                `}
            </div>
        `;
    }

    openAddRadioModal() {
        const name = prompt("Enter Radio Station Name:");
        if (!name) return;
        const url = prompt("Enter Stream URL (MP3/AAC/HLS):");
        if (!url) return;
        this.saveToMyStations({
            id: Date.now(),
            name: name.trim(),
            url: url.trim(),
            country: "Custom",
            continent: "Custom",
            format: "STREAM",
            bitrate: 128
        });
    }

    formatTime(milliseconds) {
        if (!isFinite(milliseconds) || milliseconds < 0) return "00:00";
        const totalSec = Math.floor(milliseconds / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
    }
}

window.vitoriusApp = new VitoriusApp();
