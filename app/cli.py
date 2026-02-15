from __future__ import annotations
from typing import List
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.data_loader import load_data
from app.models import UserPreference
from app.rule_engine import forward_chain
from app.utils import clamp


def prompt_list(label: str, options: List[str]) -> List[str]:
    if not options:
        return []
    print(label)
    print(", ".join(options))
    raw = input("Comma-separated (or blank): ").strip()
    if not raw:
        return []
    return [r.strip() for r in raw.split(",") if r.strip() in options]


def main():
    parser = argparse.ArgumentParser(description="Movie Expert System CLI")
    parser.add_argument(
        "--dataset",
        default="movielens_100k",
        choices=["movielens_100k", "tmdb_5000", "merged"],
        help="Dataset to use (default: movielens_100k)",
    )
    args = parser.parse_args()

    if args.dataset == "movielens_100k":
        dataset_key = "movielens-100k"
    elif args.dataset == "tmdb_5000":
        dataset_key = "tmdb"
    else:
        dataset_key = "merged"
    data_dir = Path(__file__).resolve().parents[1] / "data"
    context = load_data(str(data_dir), dataset=dataset_key)
    if not context.dataset:
        print(context.error)
        return

    preferred_genres = prompt_list("Preferred genres:", context.genres)
    excluded_genres = prompt_list("Excluded genres:", context.genres)

    year_start = int(input(f"Year start [{context.year_min}-{context.year_max}]: ") or context.year_min)
    year_end = int(input(f"Year end [{context.year_min}-{context.year_max}]: ") or context.year_max)

    min_rating = float(input(f"Minimum rating (0-{context.rating_scale_max}): ") or 0)
    top_k = int(input("Top K (default 10): ") or 10)

    popularity_pref = "any"
    if context.popularity_field:
        popularity_pref = (input("Popularity preference (any/popular/obscure) [any]: ") or "any").strip()

    runtime_max = None
    if context.has_runtime:
        raw_runtime = input("Max runtime in minutes (blank to skip): ").strip()
        runtime_max = int(raw_runtime) if raw_runtime else None

    language = None
    if context.has_language:
        language = input("Language preference (e.g., en; blank to skip): ").strip() or None

    prefs = UserPreference(
        preferred_genres=preferred_genres,
        excluded_genres=excluded_genres,
        year_range=[
            int(clamp(year_start, context.year_min, context.year_max)),
            int(clamp(year_end, context.year_min, context.year_max)),
        ],
        min_rating=float(clamp(min_rating, 0, context.rating_scale_max)),
        popularity_preference=popularity_pref if popularity_pref in ["any", "popular", "obscure"] else "any",
        runtime_max=runtime_max,
        language=language,
        top_k=max(1, min(top_k, 50)),
    )

    output = forward_chain(context.movies, prefs, context)
    if output["message"]:
        print(output["message"])
        return

    print("\nTOP RECOMMENDATIONS")
    for idx, rec in enumerate(output["results"][: prefs.top_k], start=1):
        movie = rec["movie"]
        why = sorted(rec["fired_rules"], key=lambda x: abs(x["delta"]), reverse=True)[:6]
        print(f"{idx}. {movie.title} ({movie.year or 'Unknown'})")
        print(f"   Genres: {', '.join(movie.genres) or 'Unknown'}")
        print(f"   Rating: {movie.rating} | Count: {movie.rating_count}")
        print(f"   Score: {rec['score']:.2f} | Rules fired: {len(rec['fired_rules'])}")
        for w in why:
            print(f"   Why: {w['explanation']} ({w['rule_id']})")
        print("-" * 60)


if __name__ == "__main__":
    main()
