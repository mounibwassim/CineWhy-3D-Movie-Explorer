from __future__ import annotations
from typing import Dict, List, Any, Tuple

from app.models import Movie, UserPreference
from app.rules import build_rules
from app.utils import clamp


def apply_hard_filters(movies: List[Movie], prefs: UserPreference, context) -> List[Movie]:
    year_start = int(clamp(prefs.year_range[0], context.year_min, context.year_max))
    year_end = int(clamp(prefs.year_range[1], context.year_min, context.year_max))
    min_year, max_year = min(year_start, year_end), max(year_start, year_end)

    filtered = [m for m in movies if m.year and min_year <= m.year <= max_year]

    if prefs.preferred_genres:
        pref_set = set(prefs.preferred_genres)
        filtered = [m for m in filtered if any(g in pref_set for g in m.genres)]

    if prefs.excluded_genres:
        excl_set = set(prefs.excluded_genres)
        filtered = [m for m in filtered if all(g not in excl_set for g in m.genres)]

    filtered = [m for m in filtered if m.rating >= prefs.min_rating]

    if context.has_runtime and prefs.runtime_max:
        filtered = [m for m in filtered if m.runtime is not None and m.runtime <= prefs.runtime_max]

    if context.has_language and prefs.language:
        filtered = [m for m in filtered if m.language == prefs.language]

    return filtered


def forward_chain(movies: List[Movie], prefs: UserPreference, context) -> Dict[str, Any]:
    rules = build_rules(context)
    candidates = apply_hard_filters(movies, prefs, context)
    if not candidates:
        return {
            "rules": rules,
            "candidates": [],
            "results": [],
            "message": "No results after hard filters. Try loosening year range, rating, or genres.",
        }

    results = []
    for movie in candidates:
        state = {
            "score": 0.0,
            "fired_rules": [],
            "movie": movie,
            "rule_id": None,
            "rule_desc": None,
        }
        for rule in rules:
            if rule.condition(movie, prefs):
                state["rule_id"] = rule.id
                state["rule_desc"] = rule.description
                rule.action(state)
        results.append(
            {
                "movie": movie,
                "score": state["score"],
                "fired_rules": state["fired_rules"],
            }
        )

    # Conflict resolution: sort by score, then rating, then popularity (all descending).
    results.sort(
        key=lambda r: (
            -r["score"],
            -(r["movie"].rating or 0),
            -(r["movie"].popularity or 0),
        )
    )

    return {
        "rules": rules,
        "candidates": candidates,
        "results": results,
        "message": None,
    }
