from __future__ import annotations

import sys
from pathlib import Path

# Add project root to sys.path so 'app' module can be found
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import streamlit as st

from app.data_loader import load_data
from app.models import UserPreference
from app.rule_engine import forward_chain
from app.utils import clamp


st.set_page_config(page_title="Movie Expert System", layout="wide")

st.title("Movie Expert System")
st.write("Rule-based recommendations with explanations (no ML).")

with st.sidebar:
    st.header("Dataset")
    dataset_choice = st.selectbox(
        "Select dataset",
        ["MovieLens 100K", "TMDB 5000", "Merged (MovieLens + TMDB)"],
        index=0,
        key="dataset_choice",
    )
    if dataset_choice == "MovieLens 100K":
        dataset_key = "movielens-100k"
    elif dataset_choice == "TMDB 5000":
        dataset_key = "tmdb"
    else:
        dataset_key = "merged"

data_dir = Path(__file__).resolve().parents[1] / "data"
context = load_data(str(data_dir), dataset=dataset_key)
if not context.dataset:
    st.error(context.error)
    st.stop()

with st.sidebar:
    st.header("Preferences")
    preferred_genres = st.multiselect("Include genres", context.genres)
    excluded_genres = st.multiselect("Exclude genres", context.genres)

    year_range = st.slider(
        "Year range",
        min_value=context.year_min,
        max_value=context.year_max,
        value=(context.year_min, context.year_max),
    )

    min_rating = st.slider(
        "Minimum rating",
        min_value=0.0,
        max_value=float(context.rating_scale_max),
        value=0.0,
        step=0.1,
    )

    top_k = st.number_input("Top K", min_value=1, max_value=50, value=10, step=1)

    popularity_pref = "any"
    if context.popularity_field:
        popularity_pref = st.selectbox("Popularity preference", ["any", "popular", "obscure"], index=0)

    runtime_max = None
    if context.has_runtime:
        runtime_max = st.number_input("Max runtime (minutes)", min_value=0, max_value=400, value=0, step=5)
        runtime_max = runtime_max if runtime_max > 0 else None

    language = None
    if context.has_language:
        language = st.text_input("Language preference (e.g., en)", value="").strip() or None

st.caption(f"Loaded dataset: {context.dataset} | Movies: {len(context.movies)}")

prefs = UserPreference(
    preferred_genres=preferred_genres,
    excluded_genres=excluded_genres,
    year_range=[
        int(clamp(year_range[0], context.year_min, context.year_max)),
        int(clamp(year_range[1], context.year_min, context.year_max)),
    ],
    min_rating=float(clamp(min_rating, 0, context.rating_scale_max)),
    popularity_preference=popularity_pref,
    runtime_max=runtime_max,
    language=language,
    top_k=int(top_k),
)

output = forward_chain(context.movies, prefs, context)
if output["message"]:
    st.warning(output["message"])
else:
    st.subheader("Top Recommendations")
    for rec in output["results"][: prefs.top_k]:
        movie = rec["movie"]
        why = sorted(rec["fired_rules"], key=lambda x: abs(x["delta"]), reverse=True)[:6]
        with st.expander(f"{movie.title} ({movie.year or 'Unknown'})"):
            st.write(f"Genres: {', '.join(movie.genres) if movie.genres else 'Unknown'}")
            st.write(f"Rating: {movie.rating} | Count: {movie.rating_count}")
            if movie.runtime is not None:
                st.write(f"Runtime: {movie.runtime} min")
            if movie.language:
                st.write(f"Language: {movie.language}")
            st.write(f"Score: {rec['score']:.2f} | Rules fired: {len(rec['fired_rules'])}")
            st.markdown("**Why recommended:**")
            for w in why:
                st.write(f"- {w['explanation']} ({w['rule_id']})")
