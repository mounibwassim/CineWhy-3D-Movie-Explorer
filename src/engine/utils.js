export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function parseYearFromTitle(title) {
    if (typeof title !== "string") return null;
    const match = title.match(/\((\d{4})\)\s*$/);
    return match ? parseInt(match[1], 10) : null;
}

export function cleanGenres(genres) {
    if (!genres) return [];
    if (typeof genres === "string") {
        return genres.split("|").map(g => g.trim()).filter(g => g && g !== "(no genres listed)");
    }
    return genres.map(g => String(g).trim()).filter(g => g && g !== "Unknown");
}

export function getDecade(year) {
    if (!year) return null;
    return Math.floor(year / 10) * 10;
}

export function getQualityBand(rating, scaleMax) {
    if (!rating && rating !== 0) return "unknown";
    if (scaleMax <= 5) {
        if (rating >= 4.2) return "excellent";
        if (rating >= 3.5) return "good";
        if (rating >= 2.5) return "average";
        return "low";
    }
    if (rating >= 8.0) return "excellent";
    if (rating >= 7.0) return "good";
    if (rating >= 5.5) return "average";
    return "low";
}

export function getRuntimeCategory(runtime) {
    if (!runtime && runtime !== 0) return null;
    if (runtime < 90) return "short";
    if (runtime <= 120) return "medium";
    return "long";
}

export function getPopularityBand(value, q1, q3) {
    if (!value && value !== 0) return "unknown";
    if (value >= q3) return "popular";
    if (value <= q1) return "obscure";
    return "average";
}
