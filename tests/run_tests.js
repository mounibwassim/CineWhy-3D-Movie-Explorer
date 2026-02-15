import assert from "assert";
import path from "path";
import { fileURLToPath } from "url";
import { loadDataset } from "../src/engine/loader.js";
import { recommend, applyHardFilters } from "../src/engine/infer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");

const context = loadDataset(dataDir);
if (!context.dataset) {
  console.log("Skipping tests: dataset not found in /data.");
  process.exit(0);
}

const basePrefs = {
  preferredGenres: [],
  excludedGenres: [],
  yearRange: [context.yearMin, context.yearMax],
  minRating: 0,
  popularityPref: "any",
  runtimeMax: 0,
  language: null,
  topK: 10,
};

const profiles = [
  {
    name: "Action/Adventure fan",
    prefs: {
      preferredGenres: context.genres.filter((g) => ["Action", "Adventure"].includes(g)),
    },
  },
  {
    name: "Classic drama lover",
    prefs: {
      preferredGenres: context.genres.filter((g) => g === "Drama"),
      yearRange: [context.yearMin, Math.min(context.yearMax, context.yearMin + 30)],
    },
  },
  {
    name: "Family movie night",
    prefs: {
      preferredGenres: context.genres.filter((g) => ["Family", "Animation", "Comedy"].includes(g)),
    },
  },
];

for (const profile of profiles) {
  const prefs = { ...basePrefs, ...profile.prefs };
  const filtered = applyHardFilters(context.facts, prefs, context);
  if (!filtered.length) {
    console.log(`[${profile.name}] No candidates after hard filters.`);
    continue;
  }
  const { results } = recommend(context.facts, prefs, context);
  assert.ok(results.length > 0, `${profile.name}: no recommendations`);
  assert.ok(results.some((r) => r.fired.length > 0), `${profile.name}: no explanations`);

  for (const rec of results.slice(0, 10)) {
    const movie = rec.movie;
    assert.ok(movie.year >= prefs.yearRange[0] && movie.year <= prefs.yearRange[1], `${profile.name}: year constraint broken`);
    if (prefs.preferredGenres.length) {
      assert.ok(movie.genres.some((g) => prefs.preferredGenres.includes(g)), `${profile.name}: preferred genre constraint broken`);
    }
    if (prefs.excludedGenres.length) {
      assert.ok(movie.genres.every((g) => !prefs.excludedGenres.includes(g)), `${profile.name}: excluded genre constraint broken`);
    }
    assert.ok(movie[context.ratingField] >= prefs.minRating, `${profile.name}: min rating constraint broken`);
    if (context.hasRuntime && prefs.runtimeMax) {
      assert.ok(movie.runtime <= prefs.runtimeMax, `${profile.name}: runtime constraint broken`);
    }
    if (context.hasLanguage && prefs.language) {
      assert.strictEqual(movie.language, prefs.language, `${profile.name}: language constraint broken`);
    }
  }
  console.log(`[${profile.name}] OK`);
}
