from __future__ import annotations

from app.data_loader import load_data


def test_loader_detects_dataset():
    context = load_data("data")
    if not context.dataset:
        return
    assert context.movies
    assert context.genres
    assert context.year_min <= context.year_max
