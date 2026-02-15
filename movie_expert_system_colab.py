# =========================
# CELL 1 — Title
# =========================
print("Rule-Based Expert System for Movie Recommendation (No ML)")

# =========================
# CELL 2 — Imports & Helpers
# =========================
import os
import re
import ast
from typing import List, Dict, Any, Optional

import numpy as np
import pandas as pd


def safe_literal_eval(val):
    if pd.isna(val):
        return []
    if isinstance(val, list):
        return val
    try:
        return ast.literal_eval(val)
    except Exception:
        return []


def parse_year_from_title(title: str) -> Optional[int]:
    if not isinstance(title, str):
        return None
    match = re.search(r"\((\d{4})\)\s*$", title)
    if match:
        return int(match.group(1))
    return None


def clean_genres_list(genres):
    if genres is None:
        return []
    if isinstance(genres, str):
        parts = [g.strip() for g in genres.split("|") if g.strip()]
    else:
        parts = [str(g).strip() for g in genres if str(g).strip()]
    parts = ["Unknown" if g == "(no genres listed)" else g for g in parts]
    return [g for g in parts if g and g != "Unknown"]


def decade_from_year(year: Optional[int]) -> Optional[int]:
    if year is None or pd.isna(year):
        return None
    return int(year // 10 * 10)


def quality_band(rating: float, scale_max: float) -> str:
    if pd.isna(rating):
        return "unknown"
    if scale_max <= 5:
        if rating >= 4.2:
            return "excellent"
        if rating >= 3.5:
            return "good"
        if rating >= 2.5:
            return "average"
        return "low"
    if rating >= 8.0:
        return "excellent"
    if rating >= 7.0:
        return "good"
    if rating >= 5.5:
        return "average"
    return "low"


def runtime_category(runtime: float) -> Optional[str]:
    if pd.isna(runtime):
        return None
    if runtime < 90:
        return "short"
    if runtime <= 120:
        return "medium"
    return "long"


def popularity_band(series: pd.Series) -> pd.Series:
    if series is None or series.empty:
        return pd.Series([], dtype="object")
    q = series.quantile([0.25, 0.75]).to_dict()

    def band(val):
        if pd.isna(val):
            return "unknown"
        if val >= q[0.75]:
            return "popular"
        if val <= q[0.25]:
            return "obscure"
        return "average"

    return series.apply(band)


def clamp(val, lo, hi):
    return max(lo, min(hi, val))


# =========================
# CELL 3 — Data Loading (Colab-friendly)
# =========================
print("Choose data source:")
print("1) Upload files")
print("2) Mount Google Drive")
try:
    choice = input("Enter 1 or 2 (default 1): ").strip() or "1"
except Exception:
    choice = "1"

data_dir = None
if choice == "2":
    try:
        from google.colab import drive
        drive.mount("/content/drive")
        data_dir = input("Enter folder path in Drive (e.g., /content/drive/MyDrive/movielens): ").strip()
    except Exception:
        print("Google Drive not available, falling back to upload.")
        choice = "1"

if choice == "1":
    try:
        from google.colab import files
        files.upload()
        data_dir = "/content"
    except Exception:
        data_dir = input("Enter local folder path containing dataset files: ").strip()

if not data_dir or not os.path.isdir(data_dir):
    raise SystemExit("Invalid data directory. Please provide a valid folder path.")

print(f"Using data directory: {data_dir}")


# =========================
# CELL 4 — Dataset Detection & Loading
# =========================

def detect_dataset(path: str):
    files = set(os.listdir(path))
    if {"movies.csv", "ratings.csv"}.issubset(files):
        return "movielens"
    if "tmdb_5000_movies.csv" in files:
        return "tmdb"
    return None


dataset_type = detect_dataset(data_dir)
if dataset_type is None:
    raise SystemExit(
        "Dataset not found. Upload MovieLens (movies.csv + ratings.csv) "
        "or TMDB (tmdb_5000_movies.csv)."
    )

print(f"Detected dataset: {dataset_type}")

if dataset_type == "movielens":
    movies = pd.read_csv(os.path.join(data_dir, "movies.csv"))
    ratings = pd.read_csv(os.path.join(data_dir, "ratings.csv"))
else:
    movies = pd.read_csv(os.path.join(data_dir, "tmdb_5000_movies.csv"))

print("Columns:", list(movies.columns))
print("Row count:", len(movies))
print("Sample rows:")
print(movies.head(3))


# =========================
# CELL 5 — Preprocessing
# =========================
facts = None
rating_scale_max = None
popularity_field = None
rating_field = None
count_field = None
language_field = None
runtime_field = None

if dataset_type == "movielens":
    movies["year"] = movies["title"].apply(parse_year_from_title)
    movies["genres_list"] = movies["genres"].apply(clean_genres_list)
    agg = ratings.groupby("movieId").agg(
        avg_rating=("rating", "mean"),
        rating_count=("rating", "count"),
    ).reset_index()
    facts = movies.merge(agg, on="movieId", how="left")
    facts["avg_rating"] = facts["avg_rating"].fillna(0)
    facts["rating_count"] = facts["rating_count"].fillna(0)
    rating_scale_max = 5.0
    rating_field = "avg_rating"
    count_field = "rating_count"
    popularity_field = "rating_count"
    language_field = None
    runtime_field = None
else:
    movies["genres_list"] = movies["genres"].apply(safe_literal_eval).apply(
        lambda xs: [x.get("name") for x in xs if isinstance(x, dict) and x.get("name")]
    )
    movies["genres_list"] = movies["genres_list"].apply(clean_genres_list)
    movies["year"] = pd.to_datetime(movies["release_date"], errors="coerce").dt.year
    facts = movies.copy()
    rating_scale_max = 10.0
    rating_field = "vote_average"
    count_field = "vote_count"
    popularity_field = "popularity" if "popularity" in facts.columns else "vote_count"
    language_field = "original_language" if "original_language" in facts.columns else None
    runtime_field = "runtime" if "runtime" in facts.columns else None

facts["decade"] = facts["year"].apply(decade_from_year)
facts["quality_band"] = facts[rating_field].apply(lambda r: quality_band(r, rating_scale_max))
facts["runtime_category"] = facts[runtime_field].apply(runtime_category) if runtime_field else None
facts["popularity_band"] = popularity_band(facts[popularity_field]) if popularity_field else None

all_genres = sorted({g for gs in facts["genres_list"] for g in gs if g})
if "Unknown" in all_genres:
    all_genres.remove("Unknown")

print(f"Derived features added. Available genres: {len(all_genres)}")


# =========================
# CELL 6 — User Preferences (Dataset-aware UI)
# =========================

def prompt_list(prompt, options, allow_empty=True):
    if not options:
        return []
    print(prompt)
    print(", ".join(options))
    raw = input("Enter comma-separated values (or empty to skip): ").strip()
    if not raw and allow_empty:
        return []
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    selected = [p for p in parts if p in options]
    if not selected and parts:
        print("No valid selections found; skipping.")
    return selected


def prompt_float(prompt, default):
    raw = input(f"{prompt} (default {default}): ").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except Exception:
        return default


def prompt_int(prompt, default):
    raw = input(f"{prompt} (default {default}): ").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except Exception:
        return default


prefs: Dict[str, Any] = {}
prefs["preferred_genres"] = prompt_list("Preferred genres (optional):", all_genres)
prefs["excluded_genres"] = prompt_list("Excluded genres (optional):", all_genres)

years = facts["year"].dropna()
year_min = int(years.min()) if not years.empty else 1900
year_max = int(years.max()) if not years.empty else 2025

yr_start = prompt_int(f"Year range start [{year_min}-{year_max}] (optional)", year_min)
yr_end = prompt_int(f"Year range end [{year_min}-{year_max}] (optional)", year_max)

yr_start = clamp(yr_start, year_min, year_max)
yr_end = clamp(yr_end, year_min, year_max)
if yr_start > yr_end:
    print("Year range invalid; swapping values.")
    yr_start, yr_end = yr_end, yr_start

prefs["year_range"] = (yr_start, yr_end)

min_rating = prompt_float(f"Minimum rating (scale 0-{rating_scale_max})", 0.0)
min_rating = clamp(min_rating, 0.0, rating_scale_max)
prefs["min_rating"] = min_rating

if popularity_field:
    raw_pop = input("Popularity preference (any/popular/obscure) [any]: ").strip().lower() or "any"
    prefs["popularity_pref"] = raw_pop if raw_pop in ["any", "popular", "obscure"] else "any"
else:
    prefs["popularity_pref"] = None

if runtime_field:
    prefs["runtime_max"] = prompt_int("Maximum runtime in minutes (optional, 0 to skip)", 0)
else:
    prefs["runtime_max"] = None

if language_field:
    prefs["language"] = input("Language preference (optional, e.g., en): ").strip() or None
else:
    prefs["language"] = None

prefs["top_k"] = prompt_int("Top K recommendations", 10)


# =========================
# CELL 7 — Rule System
# =========================

class Rule:
    def __init__(self, rid: str, description: str, weight: float, condition, action):
        self.id = rid
        self.description = description
        self.weight = weight
        self.condition = condition
        self.action = action


def add_score(state, delta, explanation, evidence):
    state["score"] += delta
    state["fired"].append({
        "rule_id": state["rule_id"],
        "desc": state["rule_desc"],
        "delta": delta,
        "explanation": explanation,
        "evidence": evidence,
    })


def build_rules(facts_df, prefs):
    rules: List[Rule] = []

    top_genres = pd.Series([g for gs in facts_df["genres_list"] for g in gs if g]).value_counts().head(15).index.tolist()
    for g in top_genres:
        def cond_factory(genre):
            return lambda m, p: genre in m["genres_list"] and (not p["preferred_genres"] or genre in p["preferred_genres"])

        def act_factory(genre):
            return lambda state: add_score(
                state,
                1.5,
                f"Matches popular genre '{genre}'",
                {"genre": genre},
            )

        rules.append(Rule(f"GENRE_{g}", f"Boost for genre {g}", 1.5, cond_factory(g), act_factory(g)))

    rules.append(Rule(
        "GENRE_MULTI",
        "Boost for multiple preferred genres",
        2.0,
        lambda m, p: p["preferred_genres"] and len(set(m["genres_list"]) & set(p["preferred_genres"])) >= 2,
        lambda state: add_score(
            state,
            2.0,
            "Matches multiple preferred genres",
            {"matched_genres": state["movie"]["genres_list"]},
        ),
    ))

    rules.append(Rule(
        "QUALITY_EXCELLENT",
        "Excellent quality",
        3.0,
        lambda m, p: m["quality_band"] == "excellent",
        lambda state: add_score(state, 3.0, "High quality rating", {"rating": state["movie"][rating_field]}),
    ))
    rules.append(Rule(
        "QUALITY_GOOD",
        "Good quality",
        2.0,
        lambda m, p: m["quality_band"] == "good",
        lambda state: add_score(state, 2.0, "Good rating", {"rating": state["movie"][rating_field]}),
    ))
    rules.append(Rule(
        "QUALITY_AVERAGE",
        "Average quality",
        0.5,
        lambda m, p: m["quality_band"] == "average",
        lambda state: add_score(state, 0.5, "Average rating", {"rating": state["movie"][rating_field]}),
    ))

    if popularity_field:
        rules.append(Rule(
            "POPULARITY_POPULAR",
            "Popular title",
            1.5,
            lambda m, p: m["popularity_band"] == "popular",
            lambda state: add_score(state, 1.5, "Popular with many votes", {"popularity": state["movie"][popularity_field]}),
        ))
        rules.append(Rule(
            "POPULARITY_OBSCURE",
            "Niche pick",
            1.0,
            lambda m, p: m["popularity_band"] == "obscure",
            lambda state: add_score(state, 1.0, "Obscure gem", {"popularity": state["movie"][popularity_field]}),
        ))
        rules.append(Rule(
            "POPULARITY_PREF_MATCH",
            "Popularity preference match",
            1.5,
            lambda m, p: p["popularity_pref"] in ["popular", "obscure"] and m["popularity_band"] == p["popularity_pref"],
            lambda state: add_score(state, 1.5, "Matches popularity preference", {"popularity_band": state["movie"]["popularity_band"]}),
        ))

    rules.append(Rule(
        "DECADE_MATCH",
        "Decade match preference",
        1.5,
        lambda m, p: m["decade"] is not None and p["year_range"][0] <= m["year"] <= p["year_range"][1],
        lambda state: add_score(state, 1.5, "Within preferred era", {"decade": state["movie"]["decade"]}),
    ))

    if runtime_field:
        rules.append(Rule(
            "RUNTIME_SHORT",
            "Short runtime boost",
            0.8,
            lambda m, p: m["runtime_category"] == "short",
            lambda state: add_score(state, 0.8, "Short runtime", {"runtime": state["movie"][runtime_field]}),
        ))
        rules.append(Rule(
            "RUNTIME_MEDIUM",
            "Medium runtime boost",
            1.0,
            lambda m, p: m["runtime_category"] == "medium",
            lambda state: add_score(state, 1.0, "Balanced runtime", {"runtime": state["movie"][runtime_field]}),
        ))
        rules.append(Rule(
            "RUNTIME_LONG",
            "Long runtime boost",
            0.6,
            lambda m, p: m["runtime_category"] == "long",
            lambda state: add_score(state, 0.6, "Epic runtime", {"runtime": state["movie"][runtime_field]}),
        ))
        rules.append(Rule(
            "RUNTIME_PREF",
            "Runtime preference match",
            1.5,
            lambda m, p: p["runtime_max"] and p["runtime_max"] > 0 and m[runtime_field] <= p["runtime_max"],
            lambda state: add_score(state, 1.5, "Within runtime max", {"runtime": state["movie"][runtime_field]}),
        ))

    if language_field:
        rules.append(Rule(
            "LANGUAGE_MATCH",
            "Preferred language match",
            2.0,
            lambda m, p: p["language"] and m[language_field] == p["language"],
            lambda state: add_score(state, 2.0, "Matches language preference", {"language": state["movie"][language_field]}),
        ))

    combo_rules = [
        ("Action", "Sci-Fi"),
        ("Drama", "Romance"),
        ("Animation", "Family"),
        ("Comedy", "Romance"),
        ("Adventure", "Fantasy"),
    ]
    for a, b in combo_rules:
        rules.append(Rule(
            f"COMBO_{a}_{b}",
            f"Combo {a}+{b} with quality",
            2.5,
            lambda m, p, ga=a, gb=b: ga in m["genres_list"] and gb in m["genres_list"] and m["quality_band"] in ["excellent", "good"],
            lambda state, ga=a, gb=b: add_score(
                state,
                2.5,
                f"Strong combo: {ga} + {gb} with quality",
                {"genres": [ga, gb], "rating": state["movie"][rating_field]},
            ),
        ))

    if len(rules) < 30:
        extra_genres = pd.Series([g for gs in facts_df["genres_list"] for g in gs if g]).value_counts().index.tolist()
        for g in extra_genres:
            if len(rules) >= 30:
                break
            rules.append(Rule(
                f"GENRE_AFFINITY_{g}",
                f"Affinity for genre {g}",
                0.8,
                lambda m, p, gg=g: gg in m["genres_list"],
                lambda state, gg=g: add_score(state, 0.8, f"Has genre {gg}", {"genre": gg}),
            ))

    return rules


rules = build_rules(facts, prefs)
print(f"Rule base size: {len(rules)}")


# =========================
# CELL 8 — Inference Engine (Forward Chaining)
# =========================

def apply_hard_constraints(df: pd.DataFrame, prefs: Dict[str, Any]):
    filtered = df.copy()

    yr_start, yr_end = prefs["year_range"]
    filtered = filtered[(filtered["year"].fillna(0) >= yr_start) & (filtered["year"].fillna(0) <= yr_end)]

    if prefs["preferred_genres"]:
        pref_set = set(prefs["preferred_genres"])
        filtered = filtered[filtered["genres_list"].apply(lambda gs: len(set(gs) & pref_set) > 0)]

    if prefs["excluded_genres"]:
        excl_set = set(prefs["excluded_genres"])
        filtered = filtered[filtered["genres_list"].apply(lambda gs: len(set(gs) & excl_set) == 0)]

    filtered = filtered[filtered[rating_field] >= prefs["min_rating"]]

    if runtime_field and prefs["runtime_max"] and prefs["runtime_max"] > 0:
        filtered = filtered[filtered[runtime_field] <= prefs["runtime_max"]]

    if language_field and prefs["language"]:
        filtered = filtered[filtered[language_field] == prefs["language"]]

    return filtered


def infer(df: pd.DataFrame, prefs: Dict[str, Any], rules: List[Rule]):
    results = []
    for _, movie in df.iterrows():
        state = {
            "score": 0.0,
            "fired": [],
            "movie": movie,
        }
        for rule in rules:
            try:
                if rule.condition(movie, prefs):
                    state["rule_id"] = rule.id
                    state["rule_desc"] = rule.description
                    rule.action(state)
            except Exception:
                continue
        results.append({
            "movie": movie,
            "score": state["score"],
            "fired": state["fired"],
        })
    return results


candidates = apply_hard_constraints(facts, prefs)
if candidates.empty:
    print("No results after applying hard constraints.")
    print("Try loosening year range, rating minimum, or genre exclusions.")
else:
    results = infer(candidates, prefs, rules)

    def sort_key(x):
        movie = x["movie"]
        rating_val = movie.get(rating_field, 0)
        pop_val = movie.get(popularity_field, 0) if popularity_field else 0
        return (x["score"], rating_val, pop_val)

    results.sort(key=sort_key, reverse=True)
    top_k = results[:prefs["top_k"]]

    # =========================
    # CELL 9 — Output
    # =========================
    print("\nTOP K RECOMMENDATIONS")
    for idx, rec in enumerate(top_k, 1):
        m = rec["movie"]
        title = m.get("title", m.get("original_title", "Unknown Title"))
        year = int(m["year"]) if not pd.isna(m["year"]) else "Unknown"
        genres = ", ".join(m["genres_list"]) if m["genres_list"] else "Unknown"
        rating = m.get(rating_field, "NA")
        count = m.get(count_field, "NA") if count_field else "NA"
        runtime = m.get(runtime_field, None) if runtime_field else None
        language = m.get(language_field, None) if language_field else None

        print(f"{idx}. {title} ({year})")
        print(f"   Genres: {genres}")
        print(f"   Rating: {rating} | Count/Votes: {count}")
        if runtime_field:
            print(f"   Runtime: {runtime}")
        if language_field:
            print(f"   Language: {language}")
        print(f"   Score: {rec['score']:.2f} | Rules fired: {len(rec['fired'])}")
        why = sorted(rec["fired"], key=lambda x: abs(x["delta"]), reverse=True)[:6]
        for w in why:
            print(f"   Why: {w['explanation']} (rule {w['rule_id']})")
        print("-" * 60)

    print("\nSYSTEM SUMMARY")
    print(f"Dataset: {dataset_type}")
    print(f"Facts: {len(facts)}")
    print(f"Rules: {len(rules)}")
    print(f"Candidates after filters: {len(candidates)}")
    print(f"Scored movies: {len(results)}")


# =========================
# CELL 10 — Testing (Validation)
# =========================

def run_profile(profile_name, override_prefs):
    test_prefs = prefs.copy()
    test_prefs.update(override_prefs)

    test_candidates = apply_hard_constraints(facts, test_prefs)
    if test_candidates.empty:
        print(f"[{profile_name}] No candidates after hard constraints.")
        return

    test_results = infer(test_candidates, test_prefs, rules)
    test_results.sort(key=lambda x: (
        x["score"],
        x["movie"].get(rating_field, 0),
        x["movie"].get(popularity_field, 0) if popularity_field else 0,
    ), reverse=True)

    assert len(test_results) > 0, f"{profile_name}: No recommendations."
    assert any(len(r["fired"]) > 0 for r in test_results[:5]), f"{profile_name}: No explanations."

    yr_start, yr_end = test_prefs["year_range"]
    for r in test_results[:10]:
        m = r["movie"]
        if not pd.isna(m["year"]):
            assert yr_start <= m["year"] <= yr_end, f"{profile_name}: Year constraint violated."
        if test_prefs["preferred_genres"]:
            assert len(set(m["genres_list"]) & set(test_prefs["preferred_genres"])) > 0, f"{profile_name}: Preferred genre constraint violated."
        if test_prefs["excluded_genres"]:
            assert len(set(m["genres_list"]) & set(test_prefs["excluded_genres"])) == 0, f"{profile_name}: Excluded genre constraint violated."
        assert m[rating_field] >= test_prefs["min_rating"], f"{profile_name}: Min rating constraint violated."
        if runtime_field and test_prefs.get("runtime_max"):
            assert m[runtime_field] <= test_prefs["runtime_max"], f"{profile_name}: Runtime constraint violated."
        if language_field and test_prefs.get("language"):
            assert m[language_field] == test_prefs["language"], f"{profile_name}: Language constraint violated."

    print(f"[{profile_name}] OK: {len(test_results)} recommendations, explanations present.")


test_profiles = [
    ("Action/Adventure fan", {
        "preferred_genres": [g for g in ["Action", "Adventure"] if g in all_genres],
        "excluded_genres": [],
        "year_range": (year_min, year_max),
        "min_rating": 0.0,
    }),
    ("Classic drama lover", {
        "preferred_genres": [g for g in ["Drama"] if g in all_genres],
        "excluded_genres": [],
        "year_range": (year_min, min(year_max, year_min + 30)),
        "min_rating": 0.0,
    }),
    ("Family movie night", {
        "preferred_genres": [g for g in ["Family", "Animation", "Comedy"] if g in all_genres],
        "excluded_genres": [],
        "year_range": (year_min, year_max),
        "min_rating": 0.0,
    }),
]

for name, overrides in test_profiles:
    run_profile(name, overrides)
