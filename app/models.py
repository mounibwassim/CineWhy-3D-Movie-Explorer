from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class Movie:
    id: str
    title: str
    year: Optional[int]
    decade: Optional[int]
    genres: List[str]
    rating: float
    rating_count: int
    popularity: float
    runtime: Optional[float]
    language: Optional[str]
    quality_band: str
    popularity_band: str
    runtime_category: Optional[str]
    overview: str = ""
    poster_path: Optional[str] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class UserPreference:
    preferred_genres: List[str]
    excluded_genres: List[str]
    year_range: List[int]
    min_rating: float
    popularity_preference: str
    runtime_max: Optional[int]
    language: Optional[str]
    top_k: int
