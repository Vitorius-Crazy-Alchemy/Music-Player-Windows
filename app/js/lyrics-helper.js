/**
 * Vitorius Music Player Pro - Synchronized Lyrics Helper (.lrc)
 * Exact port of LyricsHelper.kt
 */

const LyricsHelper = {
    parseLrc(lrcContent) {
        if (!lrcContent || typeof lrcContent !== "string") return [];
        const lines = [];
        const timeRegex = /\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\](.*)/;

        const rawLines = lrcContent.split(/\r?\n/);
        for (const raw of rawLines) {
            const trimmed = raw.trim();
            const match = trimmed.match(timeRegex);
            if (match) {
                const min = parseInt(match[1], 10) || 0;
                const sec = parseInt(match[2], 10) || 0;
                const msPart = match[3] || "0";
                let ms = 0;
                if (msPart.length === 2) {
                    ms = (parseInt(msPart, 10) || 0) * 10;
                } else if (msPart.length === 3) {
                    ms = parseInt(msPart, 10) || 0;
                }
                const timeMs = (min * 60 + sec) * 1000 + ms;
                const text = match[4].trim();
                if (text) {
                    lines.push({ timeMs, text });
                }
            }
        }

        return lines.sort((a, b) => a.timeMs - b.timeMs);
    }
};

window.LyricsHelper = LyricsHelper;
