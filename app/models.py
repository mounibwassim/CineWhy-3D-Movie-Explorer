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
    popularity: Optional[float] = None
    runtime: Optional[float] = None
    language: Optional[str] = None
    quality_band: str = "unknown"
    popularity_band: str = "unknown"
    runtime_category: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


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
