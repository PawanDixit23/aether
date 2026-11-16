"""Shared resource guards for database-backed API paths.

These limits bound per-request working sets; they do not cap or delete stored data.
"""
from typing import Iterable, Iterator, Sequence, TypeVar

T = TypeVar("T")

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100
WRITE_BATCH_SIZE = 200
AI_CONTEXT_TASK_LIMIT = 30
AI_CONTEXT_MEMORY_LIMIT = 15
AI_CONTEXT_FINANCE_LIMIT = 60
AI_CONTEXT_CHAT_LIMIT = 40


def bounded_page(limit: int, offset: int = 0, *, default: int = DEFAULT_PAGE_SIZE) -> tuple[int, int]:
    """Validate and clamp page parameters so a client cannot request an unbounded read."""
    try:
        safe_limit = int(limit)
        safe_offset = int(offset)
    except (TypeError, ValueError):
        raise ValueError("limit and offset must be integers")
    if safe_limit < 1:
        raise ValueError("limit must be greater than zero")
    if safe_offset < 0:
        raise ValueError("offset cannot be negative")
    return min(safe_limit, MAX_PAGE_SIZE), safe_offset


def chunks(items: Sequence[T] | Iterable[T], size: int = WRITE_BATCH_SIZE) -> Iterator[list[T]]:
    """Yield bounded batches without materializing the entire input iterable."""
    if size < 1:
        raise ValueError("chunk size must be greater than zero")
    batch: list[T] = []
    for item in items:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch
