from __future__ import annotations
from dataclasses import dataclass
from typing import Callable, Dict, List, Any

from app.models import Movie, UserPreference


@dataclass
class Rule:
    id: str
    description: str
    weight: float
    condition: Callable[[Movie, UserPreference], bool]
    action: Callable[[Dict[str, Any]], None]


def add_score(state: Dict[str, Any], delta: float, explanation: str, evidence: Dict[str, Any]) -> None:
    state["score"] += delta
    state["fired_rules"].append(
        {
            "rule_id": state["rule_id"],
            "description": state["rule_desc"],
            "delta": delta,
            "explanation": explanation,
            "evidence": evidence,
        }
    )


def build_rules(context) -> List[Rule]:
    rules: List[Rule] = []
    genres = context.genres

    for genre in genres[:15]:
        rules.append(
            Rule(
                id=f"GENRE_{genre}",
                description=f"Boost for genre {genre}",
                weight=1.5,
                condition=lambda m, p, g=genre: g in m.genres and (not p.preferred_genres or g in p.preferred_genres),
                action=lambda state, g=genre: add_score(state, 1.5, f"Matches genre {g}", {"genre": g}),
            )
        )

    rules.append(
        Rule(
            id="GENRE_MULTI",
            description="Boost for multiple preferred genres",
            weight=2.0,
            condition=lambda m, p: p.preferred_genres and len(set(m.genres) & set(p.preferred_genres)) >= 2,
            action=lambda state: add_score(
                state, 2.0, "Matches multiple preferred genres", {"genres": state["movie"].genres}
            ),
        )
    )

    rules.append(
        Rule(
            id="QUALITY_EXCELLENT",
            description="Excellent quality",
            weight=3.0,
            condition=lambda m, p: m.quality_band == "excellent",
            action=lambda state: add_score(
                state, 3.0, "High quality rating", {"rating": state["movie"].rating}
            ),
        )
    )
    rules.append(
        Rule(
            id="QUALITY_GOOD",
            description="Good quality",
            weight=2.0,
            condition=lambda m, p: m.quality_band == "good",
            action=lambda state: add_score(state, 2.0, "Good rating", {"rating": state["movie"].rating}),
        )
    )
    rules.append(
        Rule(
            id="QUALITY_AVERAGE",
            description="Average quality",
            weight=0.5,
            condition=lambda m, p: m.quality_band == "average",
            action=lambda state: add_score(
                state, 0.5, "Average rating", {"rating": state["movie"].rating}
            ),
        )
    )

    if context.popularity_field:
        rules.append(
            Rule(
                id="POPULARITY_POPULAR",
                description="Popular title",
                weight=1.5,
                condition=lambda m, p: m.popularity_band == "popular",
                action=lambda state: add_score(
                    state, 1.5, "Popular with many ratings", {"popularity": state["movie"].popularity}
                ),
            )
        )
        rules.append(
            Rule(
                id="POPULARITY_OBSCURE",
                description="Obscure gem",
                weight=1.0,
                condition=lambda m, p: m.popularity_band == "obscure",
                action=lambda state: add_score(state, 1.0, "Obscure gem", {"popularity": state["movie"].popularity}),
            )
        )
        rules.append(
            Rule(
                id="POPULARITY_PREF",
                description="Matches popularity preference",
                weight=1.5,
                condition=lambda m, p: p.popularity_preference in ["popular", "obscure"]
                and m.popularity_band == p.popularity_preference,
                action=lambda state: add_score(
                    state, 1.5, "Matches popularity preference", {"band": state["movie"].popularity_band}
                ),
            )
        )

    rules.append(
        Rule(
            id="DECADE_RECENT",
            description="Boost for recent decades",
            weight=1.0,
            condition=lambda m, p: m.decade is not None and m.decade >= 2000,
            action=lambda state: add_score(state, 1.0, "Recent decade", {"decade": state["movie"].decade}),
        )
    )

    rules.append(
        Rule(
            id="DECADE_CLASSIC",
            description="Boost for classic decades",
            weight=0.8,
            condition=lambda m, p: m.decade is not None and m.decade <= 1980,
            action=lambda state: add_score(state, 0.8, "Classic decade", {"decade": state["movie"].decade}),
        )
    )

    if context.has_runtime:
        rules.append(
            Rule(
                id="RUNTIME_SHORT",
                description="Short runtime",
                weight=0.7,
                condition=lambda m, p: m.runtime_category == "short",
                action=lambda state: add_score(state, 0.7, "Short runtime", {"runtime": state["movie"].runtime}),
            )
        )
        rules.append(
            Rule(
                id="RUNTIME_MEDIUM",
                description="Medium runtime",
                weight=1.0,
                condition=lambda m, p: m.runtime_category == "medium",
                action=lambda state: add_score(state, 1.0, "Medium runtime", {"runtime": state["movie"].runtime}),
            )
        )
        rules.append(
            Rule(
                id="RUNTIME_LONG",
                description="Long runtime",
                weight=0.5,
                condition=lambda m, p: m.runtime_category == "long",
                action=lambda state: add_score(state, 0.5, "Long runtime", {"runtime": state["movie"].runtime}),
            )
        )

    if context.has_language:
        rules.append(
            Rule(
                id="LANGUAGE_MATCH",
                description="Matches language",
                weight=2.0,
                condition=lambda m, p: p.language and m.language == p.language,
                action=lambda state: add_score(state, 2.0, "Matches language preference", {"language": state["movie"].language}),
            )
        )

    combo_rules = [
        ("Action", "Sci-Fi"),
        ("Drama", "Romance"),
        ("Animation", "Family"),
        ("Comedy", "Romance"),
        ("Adventure", "Fantasy"),
    ]
    for g1, g2 in combo_rules:
        rules.append(
            Rule(
                id=f"COMBO_{g1}_{g2}",
                description=f"Strong combo {g1}+{g2}",
                weight=2.5,
                condition=lambda m, p, a=g1, b=g2: a in m.genres and b in m.genres and m.quality_band in ["good", "excellent"],
                action=lambda state, a=g1, b=g2: add_score(
                    state, 2.5, f"Strong combo: {a} + {b}", {"genres": [a, b], "rating": state["movie"].rating}
                ),
            )
        )

    decade_boosts = [1970, 1980, 1990, 2000, 2010]
    for decade in decade_boosts:
        rules.append(
            Rule(
                id=f"DECADE_{decade}",
                description=f"Boost for {decade}s",
                weight=0.8,
                condition=lambda m, p, d=decade: m.decade == d,
                action=lambda state, d=decade: add_score(state, 0.8, f"Released in {d}s", {"decade": d}),
            )
        )

    affinity_genres = genres[:10]
    for genre in affinity_genres:
        rules.append(
            Rule(
                id=f"AFFINITY_{genre}",
                description=f"Affinity for {genre}",
                weight=0.6,
                condition=lambda m, p, g=genre: g in m.genres,
                action=lambda state, g=genre: add_score(state, 0.6, f"Has genre {g}", {"genre": g}),
            )
        )

    rules.append(
        Rule(
            id="HIGH_SCORE_POPULAR",
            description="High rating and popular",
            weight=2.0,
            condition=lambda m, p: m.quality_band == "excellent" and m.popularity_band == "popular",
            action=lambda state: add_score(state, 2.0, "Highly rated and popular", {"rating": state["movie"].rating}),
        )
    )

    filler_pairs = [
        ("Thriller", "Mystery"),
        ("Crime", "Drama"),
        ("Horror", "Thriller"),
        ("Documentary", "History"),
        ("Music", "Romance"),
    ]
    for g1, g2 in filler_pairs:
        if len(rules) >= 30:
            break
        rules.append(
            Rule(
                id=f"PAIR_{g1}_{g2}",
                description=f"Pairing {g1}+{g2}",
                weight=1.1,
                condition=lambda m, p, a=g1, b=g2: a in m.genres and b in m.genres,
                action=lambda state, a=g1, b=g2: add_score(state, 1.1, f"Pairing {a} and {b}", {"genres": [a, b]}),
            )
        )

    if len(rules) < 30:
        for genre in genres:
            if len(rules) >= 30:
                break
            rules.append(
                Rule(
                    id=f"FILLER_{genre}",
                    description=f"Genre presence {genre}",
                    weight=0.4,
                    condition=lambda m, p, g=genre: g in m.genres,
                    action=lambda state, g=genre: add_score(state, 0.4, f"Has genre {g}", {"genre": g}),
                )
            )

    return rules
