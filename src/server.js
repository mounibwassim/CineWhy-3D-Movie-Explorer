import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { loadDataset } from "./engine/loader.js";
import { recommend } from "./engine/infer.js";
import { clamp } from "./engine/utils.js";
import os from "os";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "..", "data");
// Prioritize modern_movies.csv if available
const context = loadDataset(dataDir);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/dashboard", express.static(path.join(__dirname, "..", "public", "dashboard", "dist")));

app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

app.get("/api/config", (req, res) => {
  if (!context.dataset) {
    return res.json({
      ok: false,
      error: context.error,
    });
  }
  return res.json({
    ok: true,
    dataset: context.dataset,
    genres: context.genres,
    yearMin: context.yearMin,
    yearMax: context.yearMax,
    ratingScaleMax: context.ratingScaleMax,
    hasRuntime: context.hasRuntime,
    hasLanguage: context.hasLanguage,
    hasPopularity: Boolean(context.popularityField),
  });
});

app.post("/api/recommend", (req, res) => {
  if (!context.dataset) {
    return res.json({ ok: false, error: context.error });
  }

  const body = req.body || {};
  const prefs = {
    preferredGenres: Array.isArray(body.preferredGenres) ? body.preferredGenres : [],
    excludedGenres: Array.isArray(body.excludedGenres) ? body.excludedGenres : [],
    yearRange: Array.isArray(body.yearRange) ? body.yearRange : [context.yearMin, context.yearMax],
    minRating: typeof body.minRating === "number" ? body.minRating : 0,
    popularityPref: body.popularityPref || "any",
    runtimeMax: typeof body.runtimeMax === "number" ? body.runtimeMax : 0,
    language: body.language || null,
    topK: typeof body.topK === "number" ? body.topK : 10,
  };

  const yearStart = clamp(prefs.yearRange[0], context.yearMin, context.yearMax);
  const yearEnd = clamp(prefs.yearRange[1], context.yearMin, context.yearMax);
  prefs.yearRange = [Math.min(yearStart, yearEnd), Math.max(yearStart, yearEnd)];
  prefs.minRating = clamp(prefs.minRating, 0, context.ratingScaleMax);
  prefs.topK = clamp(prefs.topK, 1, 50);

  const { results, candidates, rules, message } = recommend(context.facts, prefs, context);

  const output = results.slice(0, prefs.topK).map((rec) => {
    const topWhy = rec.fired.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);
    return {
      title: rec.movie.title,
      year: rec.movie.year,
      genres: rec.movie.genres,
      overview: rec.movie.overview,
      poster_path: rec.movie.poster_path,
      image_url: rec.movie.image_url,
      backdrop_url: rec.movie.backdrop_url,
      rating: rec.movie[context.ratingField],
      ratingCount: rec.movie[context.ratingCountField],
      popularity: rec.movie[context.popularityField],
      runtime: rec.movie.runtime,
      language: rec.movie.language,
      score: rec.score,
      firedCount: rec.fired.length,
      why: topWhy,
    };
  });

  res.json({
    ok: true,
    dataset: context.dataset,
    summary: {
      facts: context.facts.length,
      rules: rules.length,
      candidates: candidates.length,
      scored: results.length,
    },
    message,
    results: output,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  const networkInterfaces = os.networkInterfaces();
  let networkUrl = "";
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        networkUrl = `http://${net.address}:${PORT}`;
        break;
      }
    }
    if (networkUrl) break;
  }

  console.log(`\n\x1b[1m\x1b[32m[Movie Expert System]\x1b[0m`);
  console.log(`  Local:   http://localhost:${PORT}`);
  if (networkUrl) {
    console.log(`  Network: ${networkUrl}`);
  }
  console.log(`\n\x1b[2mPress Ctrl+C to stop\x1b[0m\n`);
});
