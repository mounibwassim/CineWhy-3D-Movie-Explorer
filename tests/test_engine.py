from __future__ import annotations

from app.data_loader import load_data
from app.models import UserPreference
from app.rule_engine import forward_chain, apply_hard_filters


def build_base_prefs(context):
    return UserPreference(
        preferred_genres=[],
        excluded_genres=[],
        year_range=[context.year_min, context.year_max],
        min_rating=0,
        popularity_preference="any",
        runtime_max=None,
        language=None,
        top_k=10,
    )


def test_profiles():
    context = load_data("data")
    if not context.dataset:
        return

    profiles = [
        ("Action/Adventure fan", ["Action", "Adventure"]),
        ("Classic drama lover", ["Drama"]),
        ("Family movie night", ["Family", "Animation", "Comedy"]),
    ]

    for name, genres in profiles:
        prefs = build_base_prefs(context)
        prefs.preferred_genres = [g for g in genres if g in context.genres]
        if name == "Classic drama lover":
            prefs.year_range = [context.year_min, min(context.year_max, context.year_min + 30)]
        filtered = apply_hard_filters(context.movies, prefs, context)
        if not filtered:
            continue
        output = forward_chain(context.movies, prefs, context)
        assert output["results"], f"{name}: expected results"
        assert any(r["fired_rules"] for r in output["results"]), f"{name}: expected explanations"
        for rec in output["results"][:10]:
            movie = rec["movie"]
            assert prefs.year_range[0] <= movie.year <= prefs.year_range[1]
            if prefs.preferred_genres:
                assert any(g in prefs.preferred_genres for g in movie.genres)


def test_dataset_aware_rules():
    context = load_data("data")
    if not context.dataset:
        return
    prefs = build_base_prefs(context)
    output = forward_chain(context.movies, prefs, context)
    for rec in output["results"][:5]:
        fired = rec["fired_rules"]
        if not context.has_runtime:
            assert all("RUNTIME" not in f["rule_id"] for f in fired)
        if not context.has_language:
            assert all("LANGUAGE" not in f["rule_id"] for f in fired)
