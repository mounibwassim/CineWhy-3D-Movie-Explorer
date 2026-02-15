from __future__ import annotations
import re
import json
import math
from typing import Any, List, Optional


def parse_year_from_title(title: str) -> Optional[int]:
    if not isinstance(title, str):
        return None
    match = re.search(r"\((\d{4})\)\s*$", title)
    return int(match.group(1)) if match else None


def clean_genres_list(genres: Any) -> List[str]:
    if not genres:
        return []
    if isinstance(genres, str):
        parts = [g.strip() for g in genres.split("|") if g.strip()]
    else:
        parts = [str(g).strip() for g in genres if str(g).strip()]
    parts = ["Unknown" if g == "(no genres listed)" else g for g in parts]
    return [g for g in parts if g and g != "Unknown"]


def decade_from_year(year: Optional[int]) -> Optional[int]:
    if year is None:
        return None
    if isinstance(year, float) and math.isnan(year):
        return None
    try:
        return int(year // 10 * 10)
    except Exception:
        return None


def quality_band(rating: float, scale_max: float) -> str:
    if rating is None:
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


def runtime_category(runtime: Optional[float]) -> Optional[str]:
    if runtime is None:
        return None
    if runtime < 90:
        return "short"
    if runtime <= 120:
        return "medium"
    return "long"


def safe_json_loads(value: Any) -> List[Any]:
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))
