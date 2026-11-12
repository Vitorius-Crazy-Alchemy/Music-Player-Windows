/**
 * Vitorius Music Player Pro - Persistent Database & Settings Storage
 * Implements Android MusicDatabaseHelper & SettingsManager on Windows
 */

const StorageManager = {
    DB_NAME: "vitorius_music_windows",
    DB_VERSION: 1,
    db: null,

    defaultSettings: {
        repeatMode: "SEQUENTIAL", // SEQUENTIAL, REPEAT_ONE, REPEAT_ALL, STOP_AFTER_TRACK, STOP_AFTER_QUEUE
        shuffleEnabled: false,
        equalizerEnabled: false,
        equalizerPreset: -1,
        equalizerBands: {}, // { 0: 0, 1: 0, ... }
        bassBoost: 0,
        virtualizer: 0,
        loudnessEnhancer: 0,
        playbackSpeed: 1.0,
        playbackPitch: 1.0,
        audioBalance: 0.0,
        volume: 0.85,
        isPortable: true
    },

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // Playlists table
                if (!db.objectStoreNames.contains("playlists")) {
                    db.createObjectStore("playlists", { keyPath: "id", autoIncrement: true });
                }

                // Playlist Songs table
                if (!db.objectStoreNames.contains("playlist_songs")) {
                    const songStore = db.createObjectStore("playlist_songs", { keyPath: "id", autoIncrement: true });
                    songStore.createIndex("playlist_id", "playlist_id", { unique: false });
                }

                // Favorites table (keyed by uri)
                if (!db.objectStoreNames.contains("favorites")) {
                    db.createObjectStore("favorites", { keyPath: "uri" });
                }

                // Custom Radio Stations
                if (!db.objectStoreNames.contains("radio_stations")) {
                    db.createObjectStore("radio_stations", { keyPath: "url" });
                }

                // Key-value settings
                if (!db.objectStoreNames.contains("settings")) {
                    db.createObjectStore("settings", { keyPath: "key" });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = (e) => {
                console.error("IndexedDB error:", e);
                resolve(null); // graceful fallback to localStorage
            };
        });
    },

    // Settings helpers
    getSettings() {
        try {
            const saved = localStorage.getItem("vitorius_settings");
            if (saved) {
                return { ...this.defaultSettings, ...JSON.parse(saved) };
            }
        } catch (e) {}
        return { ...this.defaultSettings };
    },

    saveSettings(settings) {
        try {
            const current = this.getSettings();
            const updated = { ...current, ...settings };
            localStorage.setItem("vitorius_settings", JSON.stringify(updated));
            return updated;
        } catch (e) {
            console.error("Failed to save settings:", e);
        }
    },

    // --- FAVORITES ---
    async getAllFavorites() {
        if (!this.db) {
            const str = localStorage.getItem("vitorius_favs");
            return str ? JSON.parse(str) : [];
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction("favorites", "readonly");
            const store = tx.objectStore("favorites");
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    async toggleFavorite(item) {
        // item: { uri, title, artist, isRadio }
        const allFavs = await this.getAllFavorites();
        const existing = allFavs.find(f => f.uri === item.uri);
        const isNowFav = !existing;

        if (this.db) {
            const tx = this.db.transaction("favorites", "readwrite");
            const store = tx.objectStore("favorites");
            if (existing) {
                store.delete(item.uri);
            } else {
                store.put(item);
            }
        } else {
            let updated;
            if (existing) {
                updated = allFavs.filter(f => f.uri !== item.uri);
            } else {
                updated = [...allFavs, item];
            }
            localStorage.setItem("vitorius_favs", JSON.stringify(updated));
        }

        return isNowFav;
    },

    async isFavorite(uri) {
        const favs = await this.getAllFavorites();
        return favs.some(f => f.uri === uri);
    },

    // --- PLAYLISTS ---
    async getAllPlaylists() {
        if (!this.db) {
            const str = localStorage.getItem("vitorius_playlists");
            return str ? JSON.parse(str) : [];
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction("playlists", "readonly");
            const store = tx.objectStore("playlists");
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    async createPlaylist(name) {
        const newPl = {
            id: Date.now(),
            name: name.trim(),
            createdAt: Date.now()
        };

        if (this.db) {
            const tx = this.db.transaction("playlists", "readwrite");
            tx.objectStore("playlists").put(newPl);
        } else {
            const list = await this.getAllPlaylists();
            list.unshift(newPl);
            localStorage.setItem("vitorius_playlists", JSON.stringify(list));
        }
        return newPl;
    },

    async deletePlaylist(playlistId) {
        if (this.db) {
            const tx = this.db.transaction(["playlists", "playlist_songs"], "readwrite");
            tx.objectStore("playlists").delete(playlistId);
            const songStore = tx.objectStore("playlist_songs");
            const idx = songStore.index("playlist_id");
            const req = idx.getAllKeys(playlistId);
            req.onsuccess = () => {
                req.result.forEach(key => songStore.delete(key));
            };
        } else {
            const list = (await this.getAllPlaylists()).filter(p => p.id !== playlistId);
            localStorage.setItem("vitorius_playlists", JSON.stringify(list));
            localStorage.removeItem(`vitorius_pl_songs_${playlistId}`);
        }
    },

    async addSongToPlaylist(playlistId, song) {
        const entry = {
            id: Date.now() + Math.random(),
            playlist_id: playlistId,
            song_id: song.id,
            title: song.title,
            artist: song.artist,
            duration: song.duration,
            uri: song.uri,
            folderPath: song.folderPath || "",
            folderName: song.folderName || "",
            album: song.album || "Unknown Album"
        };

        if (this.db) {
            const tx = this.db.transaction("playlist_songs", "readwrite");
            tx.objectStore("playlist_songs").put(entry);
        } else {
            const key = `vitorius_pl_songs_${playlistId}`;
            const songs = JSON.parse(localStorage.getItem(key) || "[]");
            songs.push(entry);
            localStorage.setItem(key, JSON.stringify(songs));
        }
    },

    async removeSongFromPlaylist(playlistId, songId) {
        if (this.db) {
            const tx = this.db.transaction("playlist_songs", "readwrite");
            const store = tx.objectStore("playlist_songs");
            const req = store.getAll();
            req.onsuccess = () => {
                const match = req.result.find(item => item.playlist_id === playlistId && (item.song_id === songId || item.id === songId));
                if (match) store.delete(match.id);
            };
        } else {
            const key = `vitorius_pl_songs_${playlistId}`;
            const songs = JSON.parse(localStorage.getItem(key) || "[]");
            const updated = songs.filter(s => s.song_id !== songId && s.id !== songId);
            localStorage.setItem(key, JSON.stringify(updated));
        }
    },

    async getSongsForPlaylist(playlistId) {
        if (!this.db) {
            const key = `vitorius_pl_songs_${playlistId}`;
            return JSON.parse(localStorage.getItem(key) || "[]");
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction("playlist_songs", "readonly");
            const store = tx.objectStore("playlist_songs");
            const idx = store.index("playlist_id");
            const req = idx.getAll(playlistId);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    // --- CUSTOM RADIO STATIONS ---
    async getCustomRadioStations() {
        if (!this.db) {
            const str = localStorage.getItem("vitorius_custom_radio");
            return str ? JSON.parse(str) : [];
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction("radio_stations", "readonly");
            const store = tx.objectStore("radio_stations");
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    async addCustomRadioStation(station) {
        if (this.db) {
            const tx = this.db.transaction("radio_stations", "readwrite");
            tx.objectStore("radio_stations").put(station);
        } else {
            const list = await this.getCustomRadioStations();
            list.unshift(station);
            localStorage.setItem("vitorius_custom_radio", JSON.stringify(list));
        }
    },

    async deleteCustomRadioStation(url) {
        if (this.db) {
            const tx = this.db.transaction("radio_stations", "readwrite");
            tx.objectStore("radio_stations").delete(url);
        } else {
            const list = (await this.getCustomRadioStations()).filter(s => s.url !== url);
            localStorage.setItem("vitorius_custom_radio", JSON.stringify(list));
        }
    },

    // --- PLAYBACK STATE ---
    savePlaybackState(song, position) {
        try {
            if (!song) return;
            localStorage.setItem("vitorius_last_playback", JSON.stringify({
                song,
                position: position || 0,
                timestamp: Date.now()
            }));
        } catch (e) {}
    },

    getSavedPlaybackState() {
        try {
            const str = localStorage.getItem("vitorius_last_playback");
            return str ? JSON.parse(str) : null;
        } catch (e) {
            return null;
        }
    }
};

window.StorageManager = StorageManager;
