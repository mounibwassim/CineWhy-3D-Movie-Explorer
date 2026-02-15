const statusEl = document.getElementById("status");
const includeSelect = document.getElementById("include-genres");
const excludeSelect = document.getElementById("exclude-genres");
const yearStartInput = document.getElementById("year-start");
const yearEndInput = document.getElementById("year-end");
const minRatingInput = document.getElementById("min-rating");
const topKInput = document.getElementById("top-k");
const popularityWrapper = document.getElementById("popularity-wrapper");
const popularityPref = document.getElementById("popularity-pref");
const runtimeWrapper = document.getElementById("runtime-wrapper");
const runtimeMax = document.getElementById("runtime-max");
const languageWrapper = document.getElementById("language-wrapper");
const languageInput = document.getElementById("language");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const form = document.getElementById("prefs-form");

let config = null;

function createOption(value) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = value;
  return opt;
}

function getSelectedOptions(selectEl) {
  return Array.from(selectEl.selectedOptions).map((opt) => opt.value);
}

async function loadConfig() {
  const res = await fetch("/api/config");
  const data = await res.json();
  if (!data.ok) {
    statusEl.textContent = data.error;
    return;
  }
  config = data;
  statusEl.textContent = `Loaded ${data.dataset} dataset.`;

  includeSelect.innerHTML = "";
  excludeSelect.innerHTML = "";
  data.genres.forEach((genre) => {
    includeSelect.appendChild(createOption(genre));
    excludeSelect.appendChild(createOption(genre));
  });

  yearStartInput.value = data.yearMin;
  yearEndInput.value = data.yearMax;
  minRatingInput.value = 0;
  minRatingInput.min = 0;
  minRatingInput.max = data.ratingScaleMax;

  if (data.hasPopularity) {
    popularityWrapper.classList.remove("hidden");
  }
  if (data.hasRuntime) {
    runtimeWrapper.classList.remove("hidden");
  }
  if (data.hasLanguage) {
    languageWrapper.classList.remove("hidden");
  }
}

function renderResults(payload) {
  resultsEl.innerHTML = "";
  summaryEl.textContent = "";

  if (!payload.ok) {
    statusEl.textContent = payload.error || "Failed to load recommendations.";
    return;
  }

  if (payload.message) {
    statusEl.textContent = payload.message;
  } else {
    statusEl.textContent = "Recommendations ready.";
  }

  if (payload.summary) {
    summaryEl.textContent = `Facts: ${payload.summary.facts} | Rules: ${payload.summary.rules} | Candidates: ${payload.summary.candidates} | Scored: ${payload.summary.scored}`;
  }

  if (!payload.results.length) {
    resultsEl.textContent = "No recommendations to display.";
    return;
  }

  payload.results.forEach((rec) => {
    const card = document.createElement("div");
    card.className = "result";

    const title = document.createElement("h3");
    title.textContent = `${rec.title} (${rec.year || "Unknown"})`;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `Genres: ${rec.genres.join(", ") || "Unknown"} | Rating: ${rec.rating} | Count: ${rec.ratingCount || rec.popularity || "NA"}`;

    const score = document.createElement("div");
    score.className = "meta";
    score.textContent = `Score: ${rec.score.toFixed(2)} | Rules fired: ${rec.firedCount}`;

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Why recommended";
    details.appendChild(summary);

    const list = document.createElement("ul");
    rec.why.forEach((why) => {
      const li = document.createElement("li");
      li.textContent = `${why.explanation} (${why.ruleId})`;
      list.appendChild(li);
    });
    details.appendChild(list);

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(score);
    card.appendChild(details);
    resultsEl.appendChild(card);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!config) return;

  const payload = {
    preferredGenres: getSelectedOptions(includeSelect),
    excludedGenres: getSelectedOptions(excludeSelect),
    yearRange: [Number(yearStartInput.value), Number(yearEndInput.value)],
    minRating: Number(minRatingInput.value),
    topK: Number(topKInput.value),
    popularityPref: config.hasPopularity ? popularityPref.value : "any",
    runtimeMax: config.hasRuntime ? Number(runtimeMax.value || 0) : 0,
    language: config.hasLanguage ? languageInput.value.trim() || null : null,
  };

  const res = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  renderResults(data);
});

loadConfig();
