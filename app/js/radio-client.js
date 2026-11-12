/**
 * Vitorius Music Player Pro - Radio Client & Curated Stations
 * Mirrors the Android RadioBrowserClient and Database Seeds
 */

const RadioClient = {
    apiHosts: [
        "https://de1.api.radio-browser.info",
        "https://nl1.api.radio-browser.info",
        "https://at1.api.radio-browser.info"
    ],
    currentHostIndex: 0,

    getBaseUrl() {
        return this.apiHosts[this.currentHostIndex];
    },

    nextHost() {
        this.currentHostIndex = (this.currentHostIndex + 1) % this.apiHosts.length;
        return this.getBaseUrl();
    },

    defaultStations: [
        {
            id: 1,
            name: "Radio Paradise Main (320k HQ)",
            url: "https://stream.radioparadise.com/mp3-320",
            format: "MP3",
            continent: "Europe",
            country: "Global",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 320
        },
        {
            id: 2,
            name: "Radio Paradise Main (192k)",
            url: "https://stream.radioparadise.com/mp3-192",
            format: "MP3",
            continent: "Europe",
            country: "Global",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 192
        },
        {
            id: 3,
            name: "Radio Paradise Mellow (320k)",
            url: "https://stream.radioparadise.com/mellow-320",
            format: "MP3",
            continent: "Europe",
            country: "Global",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 320
        },
        {
            id: 4,
            name: "Radio Paradise Rock (320k)",
            url: "https://stream.radioparadise.com/rock-320",
            format: "MP3",
            continent: "Europe",
            country: "Global",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 320
        },
        {
            id: 5,
            name: "FIP Paris",
            url: "https://icecast.radiofrance.fr/fip-midfi.mp3",
            format: "MP3",
            continent: "Europe",
            country: "France",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 128
        },
        {
            id: 6,
            name: "WDR 1Live",
            url: "https://wdr-1live-live.icecast.wdr.de/wdr/1live/live/mp3/128/stream.mp3",
            format: "MP3",
            continent: "Europe",
            country: "Germany",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 128
        },
        {
            id: 7,
            name: "Classic FM UK",
            url: "https://media-ice.musicradio.com/ClassicFMMP3",
            format: "MP3",
            continent: "Europe",
            country: "UK",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 128
        },
        {
            id: 8,
            name: "Antenne Bayern",
            url: "https://stream.antenne.de/antenne/stream/mp3",
            format: "MP3",
            continent: "Europe",
            country: "Germany",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 192
        },
        {
            id: 9,
            name: "Radio 10 NL",
            url: "https://stream.radio10.nl/radio10",
            format: "MP3",
            continent: "Europe",
            country: "Netherlands",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 128
        },
        {
            id: 10,
            name: "Smooth Radio UK",
            url: "https://media-ice.musicradio.com/SmoothLondonMP3",
            format: "MP3",
            continent: "Europe",
            country: "UK",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 128
        },
        {
            id: 11,
            name: "Chill UK",
            url: "https://media-ice.musicradio.com/ChillMP3",
            format: "MP3",
            continent: "Europe",
            country: "UK",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 128
        },
        {
            id: 12,
            name: "NPR News",
            url: "https://npr-ice.streamguys1.com/live.mp3",
            format: "MP3",
            continent: "North America",
            country: "USA",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 128
        },
        {
            id: 13,
            name: "SomaFM Groove Salad (256k HQ)",
            url: "https://ice1.somafm.com/groovesalad-256-mp3",
            format: "MP3",
            continent: "North America",
            country: "USA",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 256
        },
        {
            id: 14,
            name: "Jazz24",
            url: "https://knkx-live-a.edge.audiocdn.com/6285_128k",
            format: "MP3",
            continent: "North America",
            country: "USA",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 128
        },
        {
            id: 15,
            name: "KEXP Seattle",
            url: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
            format: "MP3",
            continent: "North America",
            country: "USA",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 128
        },
        {
            id: 16,
            name: "SomaFM Beat Blender",
            url: "https://ice1.somafm.com/beatblender-128-mp3",
            format: "MP3",
            continent: "North America",
            country: "USA",
            favicon: "",
            isFavorite: false,
            isCustom: false,
            bitrate: 128
        }
    ],

    async fetchWithFallback(endpoint) {
        for (let i = 0; i < this.apiHosts.length; i++) {
            const host = this.apiHosts[(this.currentHostIndex + i) % this.apiHosts.length];
            const url = `${host}${endpoint}`;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                const response = await fetch(url, {
                    headers: { "User-Agent": "VitoriusMusicPlayerPro/4.3 (Windows)" },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const data = await response.json();
                    return data;
                }
            } catch (err) {
                console.warn(`Radio API host failed (${host}):`, err.message);
            }
        }
        return [];
    },

    async getTopStations(limit = 40) {
        const raw = await this.fetchWithFallback(`/json/stations/topvote/${limit}`);
        return this.mapStations(raw);
    },

    async searchStations(query, limit = 40) {
        if (!query || !query.trim()) return this.getTopStations(limit);
        const encoded = encodeURIComponent(query.trim());
        const raw = await this.fetchWithFallback(`/json/stations/search?name=${encoded}&limit=${limit}`);
        return this.mapStations(raw);
    },

    async getStationsByTag(tag, limit = 30) {
        const encoded = encodeURIComponent(tag.trim().toLowerCase());
        const raw = await this.fetchWithFallback(`/json/stations/bytag/${encoded}?limit=${limit}`);
        return this.mapStations(raw);
    },

    mapStations(rawList) {
        if (!Array.isArray(rawList)) return [];
        return rawList
            .filter(item => (item.url_resolved || item.url) && item.name)
            .map(item => ({
                id: item.stationuuid || Math.random().toString(36).substring(2, 9),
                name: (item.name || "Unknown Station").trim(),
                url: item.url_resolved || item.url,
                format: (item.codec || "MP3").toUpperCase(),
                continent: item.country || "Global",
                country: item.country || "Global",
                favicon: item.favicon || "",
                isFavorite: false,
                isCustom: false,
                bitrate: item.bitrate > 0 ? item.bitrate : 128
            }));
    }
};

window.RadioClient = RadioClient;
