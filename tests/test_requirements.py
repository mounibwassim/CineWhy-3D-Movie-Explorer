from __future__ import annotations

from pathlib import Path

from app.data_loader import load_data
from app.models import UserPreference
from app.rule_engine import forward_chain, apply_hard_filters
from app.rules import build_rules


def build_base_prefs(context):
    return UserPreference(
        preferred_genres=[],
        excluded_genres=[],
        year_range=[context.year_min, context.year_max],
        min_rating=0.0,
        popularity_preference="any",
        runtime_max=None,
        language=None,
        top_k=10,
    )


def test_smoke_kb_and_rules_load():
    context = load_data("data")
    assert context.dataset
    assert context.movies
    assert context.genres
    rules = build_rules(context)
    assert len(rules) >= 30
    movie = context.movies[0]
    assert hasattr(movie, "decade")
    assert hasattr(movie, "quality_band")
    assert hasattr(movie, "popularity_band")


def test_year_exact_match_constraint():
    context = load_data("data")
    prefs = build_base_prefs(context)
    sample_year = next((m.year for m in context.movies if m.year), None)
    assert sample_year is not None
    prefs.year_range = [sample_year, sample_year]
    output = forward_chain(context.movies, prefs, context)
    assert output["results"]
    assert all(rec["movie"].year == sample_year for rec in output["results"])


def test_include_exclude_conflict_results_empty():
    context = load_data("data")
    if not context.genres:
        return
    prefs = build_base_prefs(context)
    target_genre = context.genres[0]
    prefs.preferred_genres = [target_genre]
    prefs.excluded_genres = [target_genre]
    output = forward_chain(context.movies, prefs, context)
    assert not output["results"]
    assert output["message"]


def test_min_rating_strictness():
    context = load_data("data")
    prefs = build_base_prefs(context)
    prefs.min_rating = float(context.rating_scale_max)
    output = forward_chain(context.movies, prefs, context)
    if not output["results"]:
        assert output["message"]
        return
    assert all(rec["movie"].rating >= prefs.min_rating for rec in output["results"])


def test_explanations_present():
    context = load_data("data")
    prefs = build_base_prefs(context)
    output = forward_chain(context.movies, prefs, context)
    assert output["results"]
    for rec in output["results"][:10]:
        fired = rec["fired_rules"]
        assert fired
        assert all(f["rule_id"] and f["description"] and f["explanation"] for f in fired)


def test_dataset_awareness_rules_and_ui():
    context = load_data("data")
    prefs = build_base_prefs(context)
    output = forward_chain(context.movies, prefs, context)
    for rec in output["results"][:5]:
        fired = rec["fired_rules"]
        if not context.has_runtime:
            assert all("RUNTIME" not in f["rule_id"] for f in fired)
        if not context.has_language:
            assert all("LANGUAGE" not in f["rule_id"] for f in fired)

    ui_source = Path("app/streamlit_app.py").read_text(encoding="utf-8")
    assert "context.has_runtime" in ui_source
    assert "context.has_language" in ui_source


def test_no_ml_patterns_in_code():
    patterns = [
        "sklearn",
        "tensorflow",
        "torch",
        "keras",
        "surprise",
        "implicit",
        "fit(",
        "matrix factorization",
    ]
    files = list(Path("app").glob("*.py")) + [Path("movie_expert_system_colab.py")]
    for path in files:
        source = path.read_text(encoding="utf-8").lower()
        assert not any(pat in source for pat in patterns), f"ML pattern found in {path}"


def test_tmdb_loader_if_present():
    tmdb_path = Path("data/tmdb_5000_movies.csv")
    if not tmdb_path.exists():
        return
    context = load_data("data", dataset="tmdb_5000")
    assert context.dataset == "tmdb"
    assert context.movies
    assert context.has_runtime
    assert context.has_language


def test_merged_loader_if_present():
    tmdb_path = Path("data/tmdb_5000_movies.csv")
    ml_path = Path("data/u.item")
    if not tmdb_path.exists() or not ml_path.exists():
        return
    context = load_data("data", dataset="merged")
    assert context.dataset == "merged"
    assert context.movies
    assert context.has_runtime
    assert context.has_language
