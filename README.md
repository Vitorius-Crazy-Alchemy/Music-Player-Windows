# Vitorius Music Player Pro — Windows Edition (v4.3)
### Futuristic Cyberpunk Music Player & Global Live Radio Streamer

A native Windows desktop port of **Vitorius Music Player Pro**, preserving 100% of the futuristic Neon Cyan & Deep Space aesthetics, high-performance audio engine, multi-band DSP equalizer, 32-band real-time visualizer, 40,000+ online radio stations, and synchronized `.lrc` lyrics.

---

## 🚀 How to Run

### Option 1: Standalone Portable Application (Zero Installation)
1. Extract the folder `VitoriusMusicPlayerPro` to any location (or a USB flash drive).
2. Double-click **`VitoriusMusicPlayerPro.vbs`** (or `VitoriusMusicPlayerPro.bat`).
3. The app opens immediately in its own native standalone desktop window without browser bars or borders!
4. **All data** (playlists, favorites, custom stations, settings, and recordings) stays inside the local `data/` folder, leaving zero trace on the host Windows machine.

### Option 2: Full Windows Installation
1. Double-click **`install.bat`** (or compile `installer\installer.iss` with Inno Setup to produce `VitoriusMusicPlayerPro_Setup.exe`).
2. The player will be installed to `%LOCALAPPDATA%\Programs\VitoriusMusicPlayerPro`.
3. Shortcuts are automatically added to your **Desktop** and **Start Menu**.
4. To uninstall, run `uninstall.bat` or use the Windows Control Panel.

### Option 3: Compile to Native Executable (.exe)
If you want a standalone binary `VitoriusMusicPlayerPro.exe`:
1. Double-click **`compile_exe.bat`**.
2. It automatically uses Microsoft's built-in C# compiler (`csc.exe` shipped with every Windows 10 & 11) to produce `VitoriusMusicPlayerPro.exe` with zero external dependencies!

---

## ⚡ Core Features

- **Local Music Library**:
  - Drag and drop audio files or folders directly into the window.
  - Subtabs for **Tracks**, **Albums**, **Artists**, and **Folders**.
  - Supports `.mp3`, `.flac`, `.wav`, `.ogg`, `.m4a`, `.aac`, and `.opus`.
  - Instant real-time search across titles, artists, and albums.
- **Global Live Radio**:
  - Curated high-fidelity stations: Radio Paradise (320k HQ), FIP Paris, 1Live, Classic FM, SomaFM, Jazz24, KEXP, and more.
  - Explore 40,000+ stations worldwide via the integrated Radio Browser API network.
  - Genre filters: Rock, Jazz, Electronic, Classical, Pop, Chill, Ambient, News.
  - Add custom radio stream URLs (MP3, AAC, HLS).
  - Live ICY metadata track title updates.
  - **Live Radio Recording**: One-click stream recording directly to `.mp3` with real-time timer.
- **Audio Master FX (10-Band Equalizer & DSP)**:
  - 10-band Graphic Equalizer (31Hz to 16kHz) with bypass switch.
  - Presets: Flat, Rock, Pop, Jazz, Classical, Heavy Metal, Hip Hop, Electronic, Dance, Custom.
  - Bass Boost (0–100%).
  - Virtualizer / 3D Spatial Enhancer (0–100%).
  - Loudness Enhancer / Gain booster.
  - Stereo Balance slider (L 100% – Center – R 100%).
  - Playback Speed (0.5x – 2.0x) and Pitch controls with instant reset.
- **Real-Time 32-Band Cyber Visualizer**:
  - Real-time frequency spectrum analysis using Web Audio `AnalyserNode`.
  - Neon pink-to-cyan gradient frequency bars dynamically reacting to audio output.
- **Synchronized Lyrics**:
  - Companion `.lrc` file support.
  - Auto-scrolling lyrics with current singing line highlighted in neon cyan.
- **Playlists & Favorites**:
  - Create, rename, and manage custom playlists.
  - Heart toggle for both local songs and live radio stations.
- **Sleep Timer**:
  - 15, 30, 45, 60, 90 minutes with smooth volume fade-out.

---

## ⌨️ Desktop Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `←` / `→` | Seek backward / forward 5 seconds |
| `↑` / `↓` | Volume Up / Down (5%) |
| `M` | Mute / Unmute |
| `S` | Toggle Shuffle |
| `R` | Cycle Repeat Mode (Sequential, Repeat All, Repeat One, Stop) |
| `E` | Open Audio Master FX / Equalizer |
| `L` | Toggle Lyrics View |
| `Esc` | Close any open modal dialog |

---

## 🛠️ Architecture & Port Mapping

| Android Architecture (Kotlin) | Windows Port Equivalent |
|---|---|
| Jetpack Compose Material 3 Dark | Cyberpunk Neon Glassmorphism (HTML5/CSS3) |
| ExoPlayer (`androidx.media3`) | Web Audio API / HTML5 Audio Element |
| Audio Effects (`android.media.audiofx`) | Web Audio `BiquadFilterNode`, `StereoPanner`, `DynamicsCompressor` |
| Audio Visualizer FFT (`Visualizer`) | Web Audio `AnalyserNode` (32 bins, 60 FPS Canvas) |
| SQLite (`MusicDatabaseHelper`) | Dual-Mode Storage (IndexedDB + Portable JSON/Local) |
| MediaStore ContentResolver | File System Access API + Drag-and-Drop Scanner |
| RadioBrowserClient (`OkHttp`) | Native Fetch + Radio Browser API Mirrors |
| RadioRecorder (`OkHttp` chunk writing) | `MediaStreamAudioDestinationNode` + `MediaRecorder` |
| Android Service / Notifications | Windows Desktop App Mode / System Notifications |
