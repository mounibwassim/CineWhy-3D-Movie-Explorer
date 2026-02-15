from __future__ import annotations
import os
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.models import Movie
from app.utils import (
    parse_year_from_title,
    clean_genres_list,
    decade_from_year,
    quality_band,
    runtime_category,
    safe_json_loads,
)


class DataContext:
    def __init__(
        self,
        dataset: Optional[str],
        movies: List[Movie],
        genres: List[str],
        year_min: int,
        year_max: int,
        rating_scale_max: float,
        rating_field: str,
        popularity_field: Optional[str],
        has_runtime: bool,
        has_language: bool,
        error: Optional[str] = None,
    ):
        self.dataset = dataset
        self.movies = movies
        self.genres = genres
        self.year_min = year_min
        self.year_max = year_max
        self.rating_scale_max = rating_scale_max
        self.rating_field = rating_field
        self.popularity_field = popularity_field
        self.has_runtime = has_runtime
        self.has_language = has_language
        self.error = error


def detect_dataset(data_dir: str) -> Optional[str]:
    files = set(os.listdir(data_dir)) if os.path.isdir(data_dir) else set()
    if {"u.item", "u.data", "u.genre"}.issubset(files):
        return "movielens-100k"
    if {"movies.csv", "ratings.csv"}.issubset(files):
        return "movielens"
    if "tmdb_5000_movies.csv" in files:
        return "tmdb"
    return None


def popularity_band(values: pd.Series) -> pd.Series:
    if values.empty:
        return pd.Series([], dtype="object")
    q1 = values.quantile(0.25)
    q3 = values.quantile(0.75)

    def band(val):
        if pd.isna(val):
            return "unknown"
        if val >= q3:
            return "popular"
        if val <= q1:
            return "obscure"
        return "average"

    return values.apply(band)


def load_movielens(data_dir: str) -> DataContext:
    movies = pd.read_csv(os.path.join(data_dir, "movies.csv"))
    ratings = pd.read_csv(os.path.join(data_dir, "ratings.csv"))

    movies["year"] = movies["title"].apply(parse_year_from_title)
    movies["genres_list"] = movies["genres"].apply(clean_genres_list)

    stats = ratings.groupby("movieId").agg(
        avg_rating=("rating", "mean"),
        rating_count=("rating", "count"),
    )
    movies = movies.merge(stats, on="movieId", how="left")
    movies["avg_rating"] = movies["avg_rating"].fillna(0)
    movies["rating_count"] = movies["rating_count"].fillna(0)

    movies["decade"] = movies["year"].apply(decade_from_year)
    movies["quality_band"] = movies["avg_rating"].apply(lambda r: quality_band(r, 5.0))
    movies["popularity_band"] = popularity_band(movies["rating_count"])

    movie_objs = []
    for _, row in movies.iterrows():
        movie_objs.append(
            Movie(
                id=str(row["movieId"]),
                title=row["title"],
                year=int(row["year"]) if not pd.isna(row["year"]) else None,
                decade=int(row["decade"]) if not pd.isna(row["decade"]) else None,
                genres=row["genres_list"],
                rating=float(row["avg_rating"]),
                rating_count=int(row["rating_count"]),
                popularity=float(row["rating_count"]),
                runtime=None,
                language=None,
                quality_band=row["quality_band"],
                popularity_band=row["popularity_band"],
                runtime_category=None,
            )
        )

    genres = sorted({g for movie in movie_objs for g in movie.genres})
    years = [m.year for m in movie_objs if m.year]
    year_min = int(min(years)) if years else 1900
    year_max = int(max(years)) if years else 2025

    return DataContext(
        dataset="movielens",
        movies=movie_objs,
        genres=genres,
        year_min=year_min,
        year_max=year_max,
        rating_scale_max=5.0,
        rating_field="avg_rating",
        popularity_field="rating_count",
        has_runtime=False,
        has_language=False,
    )


def load_movielens_100k(data_dir: str) -> DataContext:
    genres_df = pd.read_csv(
        os.path.join(data_dir, "u.genre"),
        sep="|",
        names=["genre", "id"],
        encoding="latin-1",
    )
    genres_df = genres_df.dropna(subset=["genre", "id"])
    genres_df["id"] = genres_df["id"].astype(int)
    genres_df = genres_df.sort_values("id")
    genre_names = genres_df["genre"].tolist()

    item_columns = [
        "movie_id",
        "title",
        "release_date",
        "video_release_date",
        "imdb_url",
    ] + [f"genre_{g}" for g in genre_names]
    items = pd.read_csv(
        os.path.join(data_dir, "u.item"),
        sep="|",
        names=item_columns,
        encoding="latin-1",
        usecols=range(len(item_columns)),
    )

    ratings = pd.read_csv(
        os.path.join(data_dir, "u.data"),
        sep="\t",
        names=["user_id", "movie_id", "rating", "timestamp"],
        encoding="latin-1",
    )
    stats = ratings.groupby("movie_id").agg(
        avg_rating=("rating", "mean"),
        rating_count=("rating", "count"),
    )

    items = items.merge(stats, on="movie_id", how="left")
    items["avg_rating"] = items["avg_rating"].fillna(0)
    items["rating_count"] = items["rating_count"].fillna(0)

    def build_genres(row):
        flags = [int(row.get(f"genre_{g}", 0)) for g in genre_names]
        active = [g for g, flag in zip(genre_names, flags) if flag == 1]
        return clean_genres_list(active)

    items["genres_list"] = items.apply(build_genres, axis=1)

    items["year"] = items["title"].apply(parse_year_from_title)
    missing_years = items["year"].isna()
    items.loc[missing_years, "year"] = (
        pd.to_datetime(items.loc[missing_years, "release_date"], errors="coerce").dt.year
    )
    items["decade"] = items["year"].apply(decade_from_year)
    items["quality_band"] = items["avg_rating"].apply(lambda r: quality_band(r, 5.0))
    items["popularity_band"] = popularity_band(items["rating_count"])

    movie_objs = []
    for _, row in items.iterrows():
        movie_objs.append(
            Movie(
                id=str(row["movie_id"]),
                title=row["title"],
                year=int(row["year"]) if not pd.isna(row["year"]) else None,
                decade=int(row["decade"]) if not pd.isna(row["decade"]) else None,
                genres=row["genres_list"],
                rating=float(row["avg_rating"]),
                rating_count=int(row["rating_count"]),
                popularity=float(row["rating_count"]),
                runtime=None,
                language=None,
                quality_band=row["quality_band"],
                popularity_band=row["popularity_band"],
                runtime_category=None,
            )
        )

    genres = sorted({g for movie in movie_objs for g in movie.genres})
    years = [m.year for m in movie_objs if m.year]
    year_min = int(min(years)) if years else 1900
    year_max = int(max(years)) if years else 2025

    return DataContext(
        dataset="movielens-100k",
        movies=movie_objs,
        genres=genres,
        year_min=year_min,
        year_max=year_max,
        rating_scale_max=5.0,
        rating_field="avg_rating",
        popularity_field="rating_count",
        has_runtime=False,
        has_language=False,
    )


def load_tmdb(data_dir: str) -> DataContext:
    movies = pd.read_csv(os.path.join(data_dir, "tmdb_5000_movies.csv"))

    genres_list = movies["genres"].apply(safe_json_loads).apply(
        lambda xs: [g.get("name") for g in xs if isinstance(g, dict) and g.get("name")]
    )
    movies["genres_list"] = genres_list.apply(clean_genres_list)

    movies["year"] = pd.to_datetime(movies["release_date"], errors="coerce").dt.year
    movies["decade"] = movies["year"].apply(decade_from_year)
    movies["vote_average"] = movies["vote_average"].fillna(0)
    movies["vote_count"] = movies["vote_count"].fillna(0)
    movies["popularity"] = movies["popularity"].fillna(movies["vote_count"])
    movies["quality_band"] = movies["vote_average"].apply(lambda r: quality_band(r, 10.0))
    movies["popularity_band"] = popularity_band(movies["popularity"])

    if "runtime" in movies.columns:
        movies["runtime"] = movies["runtime"].fillna(np.nan)
        movies["runtime_category"] = movies["runtime"].apply(lambda r: runtime_category(r) if not pd.isna(r) else None)
    else:
        movies["runtime"] = np.nan
        movies["runtime_category"] = None

    if "original_language" in movies.columns:
        movies["language"] = movies["original_language"].fillna("")
    else:
        movies["language"] = ""

    movie_objs = []
    for _, row in movies.iterrows():
        movie_objs.append(
            Movie(
                id=str(row.get("id") or row.get("movie_id") or row.get("title")),
                title=row.get("title") or row.get("original_title") or "Unknown",
                year=int(row["year"]) if not pd.isna(row["year"]) else None,
                decade=int(row["decade"]) if not pd.isna(row["decade"]) else None,
                genres=row["genres_list"],
                rating=float(row["vote_average"]),
                rating_count=int(row["vote_count"]),
                popularity=float(row["popularity"]),
                runtime=float(row["runtime"]) if not pd.isna(row["runtime"]) else None,
                language=row["language"] or None,
                quality_band=row["quality_band"],
                popularity_band=row["popularity_band"],
                runtime_category=row["runtime_category"],
            )
        )

    genres = sorted({g for movie in movie_objs for g in movie.genres})
    years = [m.year for m in movie_objs if m.year]
    year_min = int(min(years)) if years else 1900
    year_max = int(max(years)) if years else 2025

    return DataContext(
        dataset="tmdb",
        movies=movie_objs,
        genres=genres,
        year_min=year_min,
        year_max=year_max,
        rating_scale_max=10.0,
        rating_field="vote_average",
        popularity_field="popularity",
        has_runtime=any(m.runtime is not None for m in movie_objs),
        has_language=any(m.language for m in movie_objs),
    )


def load_merged(data_dir: str) -> DataContext:
    movielens_ctx = load_movielens_100k(data_dir)
    tmdb_ctx = load_tmdb(data_dir)

    movies = []
    for movie in movielens_ctx.movies:
        scaled_rating = float(movie.rating) * 2.0
        movies.append(
            Movie(
                id=f"ml-{movie.id}",
                title=movie.title,
                year=movie.year,
                decade=movie.decade,
                genres=movie.genres,
                rating=scaled_rating,
                rating_count=movie.rating_count,
                popularity=movie.popularity,
                runtime=movie.runtime,
                language=movie.language,
                quality_band=quality_band(scaled_rating, 10.0),
                popularity_band=movie.popularity_band,
                runtime_category=movie.runtime_category,
                metadata={"source": "movielens-100k"},
            )
        )

    for movie in tmdb_ctx.movies:
        movies.append(
            Movie(
                id=f"tmdb-{movie.id}",
                title=movie.title,
                year=movie.year,
                decade=movie.decade,
                genres=movie.genres,
                rating=float(movie.rating),
                rating_count=movie.rating_count,
                popularity=movie.popularity,
                runtime=movie.runtime,
                language=movie.language,
                quality_band=quality_band(movie.rating, 10.0),
                popularity_band=movie.popularity_band,
                runtime_category=movie.runtime_category,
                metadata={"source": "tmdb"},
            )
        )

    genres = sorted({g for movie in movies for g in movie.genres})
    years = [m.year for m in movies if m.year]
    year_min = int(min(years)) if years else 1900
    year_max = int(max(years)) if years else 2025

    return DataContext(
        dataset="merged",
        movies=movies,
        genres=genres,
        year_min=year_min,
        year_max=year_max,
        rating_scale_max=10.0,
        rating_field="rating",
        popularity_field="popularity",
        has_runtime=any(m.runtime is not None for m in movies),
        has_language=any(m.language for m in movies),
    )


def load_data(data_dir: str, dataset: Optional[str] = None) -> DataContext:
    dataset_key = dataset.lower().strip() if dataset else None
    if dataset_key in {"movielens_100k", "movielens-100k", "ml-100k"}:
        dataset_key = "movielens-100k"
    if dataset_key in {"tmdb_5000", "tmdb-5000"}:
        dataset_key = "tmdb"
    if dataset_key in {"merged", "combined"}:
        dataset_key = "merged"

    if dataset_key:
        required = {
            "movielens-100k": ["u.item", "u.data", "u.genre"],
            "movielens": ["movies.csv", "ratings.csv"],
            "tmdb": ["tmdb_5000_movies.csv"],
            "merged": ["u.item", "u.data", "u.genre", "tmdb_5000_movies.csv"],
        }.get(dataset_key)
        if not required:
            return DataContext(
                dataset=None,
                movies=[],
                genres=[],
                year_min=1900,
                year_max=2025,
                rating_scale_max=0,
                rating_field="",
                popularity_field=None,
                has_runtime=False,
                has_language=False,
                error=f"Unknown dataset '{dataset}'. Use movielens_100k or tmdb_5000.",
            )
        missing = [name for name in required if not os.path.isfile(os.path.join(data_dir, name))]
        if missing:
            return DataContext(
                dataset=None,
                movies=[],
                genres=[],
                year_min=1900,
                year_max=2025,
                rating_scale_max=0,
                rating_field="",
                popularity_field=None,
                has_runtime=False,
                has_language=False,
                error=(
                    f"Missing dataset files for {dataset_key}: {', '.join(missing)}. "
                    "Place the files in the data/ folder."
                ),
            )
        if dataset_key == "movielens-100k":
            return load_movielens_100k(data_dir)
        if dataset_key == "movielens":
            return load_movielens(data_dir)
        if dataset_key == "tmdb":
            return load_tmdb(data_dir)
        if dataset_key == "merged":
            return load_merged(data_dir)

    detected = detect_dataset(data_dir)
    if detected == "movielens-100k":
        return load_movielens_100k(data_dir)
    if detected == "movielens":
        return load_movielens(data_dir)
    if detected == "tmdb":
        return load_tmdb(data_dir)

    return DataContext(
        dataset=None,
        movies=[],
        genres=[],
        year_min=1900,
        year_max=2025,
        rating_scale_max=0,
        rating_field="",
        popularity_field=None,
        has_runtime=False,
        has_language=False,
        error=(
            "Dataset not found. Place MovieLens 100K (u.item/u.data/u.genre), "
            "MovieLens movies.csv + ratings.csv, or TMDB tmdb_5000_movies.csv "
            "in the data/ folder."
        ),
    )
