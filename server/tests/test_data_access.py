import pytest

from data_access import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    bounded_page,
    chunks,
    validate_sync_count,
)


def test_bounded_page_applies_defaults_and_caps():
    assert bounded_page(None, None) == (DEFAULT_PAGE_SIZE, 0)
    assert bounded_page(100000, -10) == (MAX_PAGE_SIZE, 0)
    assert bounded_page(25, 75) == (25, 75)


def test_chunks_yields_only_bounded_batches():
    batches = list(chunks(range(451), 200))
    assert [len(batch) for batch in batches] == [200, 200, 51]
    assert [value for batch in batches for value in batch] == list(range(451))


def test_chunks_rejects_non_positive_size():
    with pytest.raises(ValueError):
        list(chunks([1], 0))


def test_backup_payload_guard_rejects_oversized_request():
    with pytest.raises(ValueError, match="Split it into smaller batches"):
        validate_sync_count(list(range(1000)), list(range(1000)), list(range(1)))


def test_backup_payload_guard_accepts_normal_batch():
    assert validate_sync_count(list(range(100)), list(range(100)), []) == 200
