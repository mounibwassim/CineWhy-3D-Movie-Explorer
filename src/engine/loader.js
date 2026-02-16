import fs from "fs";
import path from "path";
import {
    parseYearFromTitle,
    cleanGenres,
    getDecade,
    getQualityBand,
    getRuntimeCategory,
    getPopularityBand
} from "./utils.js";

// Minimal CSV parser since we can't easily use heavy libs without install check
function parseCSV(content, delimiter = ",") {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (!lines.length) return [];
    const headers = lines[0].split(delimiter).map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(delimiter);
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] ? values[i].trim() : "";
        });
        return obj;
    });
}

function parseMovieLensItem(content) {
    return content.split(/\r?\n/).filter(line => line.trim()).map(line => {
        const parts = line.split("|");
        if (parts.length < 5) return null;
        return {
            id: parts[0],
            title: parts[1],
            releaseDate: parts[2],
            genresFlags: parts.slice(5).map(v => parseInt(v, 10))
        };
    }).filter(Boolean);
}

export function loadDataset(dataDir) {
    const files = fs.readdirSync(dataDir);

    if (files.includes("modern_movies.csv")) {
        return loadTMDB(dataDir, "modern_movies.csv");
    } else if (files.includes("tmdb_5000_movies.csv")) {
        return loadTMDB(dataDir, "tmdb_5000_movies.csv");
    } else if (files.includes("u.item") && files.includes("u.data")) {
        return loadMovieLens100k(dataDir);
    }

    return { dataset: null, error: "No compatible dataset found in /data" };
}

function loadTMDB(dataDir, filename = "tmdb_5000_movies.csv") {
    try {
        const content = fs.readFileSync(path.join(dataDir, filename), "utf-8");
        // TMDB has JSON in columns, but we'll simplify for this recovery
        const rows = parseCSV(content);

        const popularityValues = rows.map(r => parseFloat(r.popularity)).filter(v => !isNaN(v)).sort((a, b) => a - b);
        const q1 = popularityValues[Math.floor(popularityValues.length * 0.25)] || 0;
        const q3 = popularityValues[Math.floor(popularityValues.length * 0.75)] || 0;

        const facts = rows.map(r => {
            const year = r.release_date ? parseInt(r.release_date.split("-")[0], 10) : null;
            const rating = parseFloat(r.vote_average) || 0;
            const runtime = parseFloat(r.runtime) || null;

            // Simple genre extraction if it's JSON-like string
            let genres = [];
            try {
                if (r.genres && r.genres.startsWith("[")) {
                    const matches = r.genres.match(/"name":\s*"([^"]+)"/g);
                    if (matches) genres = matches.map(m => m.split('"')[3]);
                }
            } catch (e) { }

            return {
                id: r.id || r.movie_id,
                title: r.title || r.original_title,
                overview: r.overview || "",
                poster_path: r.poster_path || null,
                image_url: r.image_url || (r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null),
                backdrop_url: r.backdrop_url || (r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : null),
                year,
                decade: getDecade(year),
                genres: cleanGenres(genres),
                vote_average: rating,
                vote_count: parseInt(r.vote_count, 10) || 0,
                popularity: parseFloat(r.popularity) || 0,
                runtime,
                language: r.original_language,
                quality_band: getQualityBand(rating, 10.0),
                popularity_band: getPopularityBand(parseFloat(r.popularity), q1, q3),
                runtime_category: getRuntimeCategory(runtime)
            };
        });

        const genres = Array.from(new Set(facts.flatMap(f => f.genres))).sort();
        const years = facts.map(f => f.year).filter(y => y);

        return {
            dataset: "tmdb",
            facts,
            genres,
            yearMin: Math.min(...years) || 1900,
            yearMax: Math.max(...years) || 2025,
            ratingScaleMax: 10.0,
            ratingField: "vote_average",
            ratingCountField: "vote_count",
            popularityField: "popularity",
            hasRuntime: true,
            hasLanguage: true
        };
    } catch (err) {
        return { dataset: null, error: "Error loading TMDB: " + err.message };
    }
}

function loadMovieLens100k(data_dir) {
    try {
        const genreNames = fs.readFileSync(path.join(data_dir, "u.genre"), "utf-8")
            .split("\n")
            .filter(l => l.trim())
            .map(l => l.split("|")[0]);

        const items = parseMovieLensItem(fs.readFileSync(path.join(data_dir, "u.item"), "utf-8"));
        const ratingsRaw = fs.readFileSync(path.join(data_dir, "u.data"), "utf-8")
            .split("\n")
            .filter(l => l.trim())
            .map(l => l.split("\t"));

        const stats = {};
        ratingsRaw.forEach(r => {
            const mid = r[1];
            const val = parseFloat(r[2]);
            if (!stats[mid]) stats[mid] = { sum: 0, count: 0 };
            stats[mid].sum += val;
            stats[mid].count += 1;
        });

        const popularityValues = Object.values(stats).map(s => s.count).sort((a, b) => a - b);
        const q1 = popularityValues[Math.floor(popularityValues.length * 0.25)] || 0;
        const q3 = popularityValues[Math.floor(popularityValues.length * 0.75)] || 0;

        const facts = items.map(item => {
            const s = stats[item.id] || { sum: 0, count: 0 };
            const rating = s.count > 0 ? s.sum / s.count : 0;
            const year = parseYearFromTitle(item.title) || (item.releaseDate ? parseInt(item.releaseDate.split("-")[2], 10) : null);
            const genres = item.genresFlags.map((f, i) => f === 1 ? genreNames[i] : null).filter(Boolean);

            return {
                id: item.id,
                title: item.title,
                year,
                decade: getDecade(year),
                genres: cleanGenres(genres),
                avg_rating: rating,
                rating_count: s.count,
                popularity: s.count,
                runtime: null,
                language: null,
                quality_band: getQualityBand(rating, 5.0),
                popularity_band: getPopularityBand(s.count, q1, q3),
                runtime_category: null
            };
        });

        const genres = Array.from(new Set(facts.flatMap(f => f.genres))).sort();
        const years = facts.map(f => f.year).filter(y => y);

        return {
            dataset: "movielens-100k",
            facts,
            genres,
            yearMin: Math.min(...years) || 1900,
            yearMax: Math.max(...years) || 2025,
            ratingScaleMax: 5.0,
            ratingField: "avg_rating",
            ratingCountField: "rating_count",
            popularityField: "rating_count",
            hasRuntime: false,
            hasLanguage: false
        };
    } catch (err) {
        return { dataset: null, error: "Error loading MovieLens 100k: " + err.message };
    }
}
