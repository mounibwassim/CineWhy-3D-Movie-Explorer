import { clamp } from "./utils.js";

export function applyHardFilters(movies, prefs, context) {
    const [yMin, yMax] = prefs.yearRange.sort((a, b) => a - b);

    return movies.filter(m => {
        // Year filter
        if (m.year && (m.year < yMin || m.year > yMax)) return false;

        // Genre Include filter
        if (prefs.preferredGenres && prefs.preferredGenres.length > 0) {
            if (!m.genres.some(g => prefs.preferredGenres.includes(g))) return false;
        }

        // Genre Exclude filter
        if (prefs.excludedGenres && prefs.excludedGenres.length > 0) {
            if (m.genres.some(g => prefs.excludedGenres.includes(g))) return false;
        }

        // Min Rating filter
        if (m[context.ratingField] < prefs.minRating) return false;

        // Runtime filter
        if (context.hasRuntime && prefs.runtimeMax > 0) {
            if (m.runtime > prefs.runtimeMax) return false;
        }

        // Language filter
        if (context.hasLanguage && prefs.language) {
            if (m.language !== prefs.language) return false;
        }

        return true;
    });
}

function addScore(state, delta, explanation, evidence) {
    state.score += delta;
    state.fired.push({
        rule_id: state.currentRuleId,
        description: state.currentRuleDesc,
        delta: delta,
        explanation: explanation,
        evidence: evidence
    });
}

export function recommend(movies, prefs, context) {
    const candidates = applyHardFilters(movies, prefs, context);

    if (candidates.length === 0) {
        return {
            results: [],
            candidates: [],
            rules: [],
            message: "No results after hard filters. Try loosening year range, rating, or genres."
        };
    }

    const rules = buildRules(context);

    const results = candidates.map(movie => {
        const state = {
            score: 0.0,
            fired: [],
            movie: movie,
            currentRuleId: null,
            currentRuleDesc: null
        };

        for (const rule of rules) {
            if (rule.condition(movie, prefs)) {
                state.currentRuleId = rule.id;
                state.currentRuleDesc = rule.description;
                rule.action(state);
            }
        }

        return state;
    });

    // Conflict resolution / Ranking
    results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const bRating = b.movie[context.ratingField] || 0;
        const aRating = a.movie[context.ratingField] || 0;
        if (bRating !== aRating) return bRating - aRating;
        return (b.movie.popularity || 0) - (a.movie.popularity || 0);
    });

    return {
        results,
        candidates,
        rules,
        message: null
    };
}

function buildRules(context) {
    const rules = [];

    // Genre Affinity
    context.genres.slice(0, 15).forEach(genre => {
        rules.push({
            id: `GENRE_${genre}`,
            description: `Boost for genre ${genre}`,
            condition: (m, p) => m.genres.includes(genre),
            action: (state) => addScore(state, 1.5, `Matches genre ${genre}`, { genre })
        });
    });

    // Multi Genre Match
    rules.push({
        id: "GENRE_MULTI",
        description: "Boost for multiple preferred genres",
        condition: (m, p) => p.preferredGenres.length > 0 && m.genres.filter(g => p.preferredGenres.includes(g)).length >= 2,
        action: (state) => addScore(state, 2.0, "Matches multiple preferred genres", { genres: state.movie.genres })
    });

    // Quality Bands
    rules.push({
        id: "QUALITY_EXCELLENT",
        description: "Excellent quality",
        condition: (m) => m.quality_band === "excellent",
        action: (state) => addScore(state, 3.0, "High quality rating", { rating: state.movie[context.ratingField] })
    });

    rules.push({
        id: "QUALITY_GOOD",
        description: "Good quality",
        condition: (m) => m.quality_band === "good",
        action: (state) => addScore(state, 2.0, "Good rating", { rating: state.movie[context.ratingField] })
    });

    // Popularity
    if (context.popularityField) {
        rules.push({
            id: "POPULARITY_POPULAR",
            description: "Popular title",
            condition: (m) => m.popularity_band === "popular",
            action: (state) => addScore(state, 1.5, "Popular with many ratings", { popularity: state.movie[context.popularityField] })
        });

        rules.push({
            id: "POPULARITY_OBSCURE",
            description: "Obscure gem",
            condition: (m) => m.popularity_band === "obscure",
            action: (state) => addScore(state, 1.0, "Obscure gem", { popularity: state.movie[context.popularityField] })
        });
    }

    // Decades
    [1970, 1980, 1990, 2000, 2010].forEach(decade => {
        rules.push({
            id: `DECADE_${decade}`,
            description: `Boost for ${decade}s`,
            condition: (m) => m.decade === decade,
            action: (state) => addScore(state, 1.0, `Released in ${decade}s`, { decade })
        });
    });

    // Combos
    const combos = [["Action", "Sci-Fi"], ["Drama", "Romance"], ["Animation", "Family"]];
    combos.forEach(([g1, g2]) => {
        rules.push({
            id: `COMBO_${g1}_${g2}`,
            description: `Strong combo ${g1}+${g2}`,
            condition: (m) => m.genres.includes(g1) && m.genres.includes(g2),
            action: (state) => addScore(state, 2.5, `Strong combo: ${g1} + ${g2}`, { genres: [g1, g2] })
        });
    });

    return rules;
}
