"""Shared guardrails for bounded database access.

These helpers do not impose a global cap on stored data. They ensure API code
uses explicit, validated page and batch sizes instead of unbounded reads.
"""
from typing import Iterable, Iterator, List, TypeVar

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100
SYNC_BATCH_SIZE = 200
MAX_SYNC_ITEMS_PER_REQUEST = 2000

T = TypeVar("T")


def bounded_page(limit: int = DEFAULT_PAGE_SIZE, offset: int = 0):
    """Return a safe page size and offset for list endpoints."""
    try:
        safe_limit = int(limit)
    except (TypeError, ValueError):
        safe_limit = DEFAULT_PAGE_SIZE
    try:
        safe_offset = int(offset)
    except (TypeError, ValueError):
        safe_offset = 0
    return max(1, min(safe_limit, MAX_PAGE_SIZE)), max(0, safe_offset)


def chunks(values: Iterable[T], size: int = SYNC_BATCH_SIZE) -> Iterator[List[T]]:
    """Yield bounded chunks without materializing the complete iterable."""
    if size < 1:
        raise ValueError("chunk size must be positive")
    batch: List[T] = []
    for value in values:
        batch.append(value)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def validate_sync_count(*collections):
    """Reject oversized backup payloads instead of silently truncating data."""
    total = sum(len(items or []) for items in collections)
    if total > MAX_SYNC_ITEMS_PER_REQUEST:
        raise ValueError(
            f"Backup contains {total} items; maximum per request is "
            f"{MAX_SYNC_ITEMS_PER_REQUEST}. Split it into smaller batches."
        )
    return total
