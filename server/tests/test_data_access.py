"""Regression tests for bounded database access helpers.

Run from the server directory with: python -m unittest discover -s tests
"""
import unittest

from data_access import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    bounded_page,
    chunks,
    validate_sync_count,
)


class DataAccessGuardrailTests(unittest.TestCase):
    def test_bounded_page_applies_defaults_and_caps(self):
        self.assertEqual(bounded_page(None, None), (DEFAULT_PAGE_SIZE, 0))
        self.assertEqual(bounded_page(100000, -10), (MAX_PAGE_SIZE, 0))
        self.assertEqual(bounded_page(25, 75), (25, 75))

    def test_chunks_yields_only_bounded_batches(self):
        batches = list(chunks(range(451), 200))
        self.assertEqual([len(batch) for batch in batches], [200, 200, 51])
        self.assertEqual([value for batch in batches for value in batch], list(range(451)))

    def test_chunks_rejects_non_positive_size(self):
        with self.assertRaises(ValueError):
            list(chunks([1], 0))

    def test_backup_payload_guard_rejects_oversized_request(self):
        with self.assertRaisesRegex(ValueError, "Split it into smaller batches"):
            validate_sync_count(list(range(1000)), list(range(1000)), [1])

    def test_backup_payload_guard_accepts_normal_batch(self):
        self.assertEqual(validate_sync_count(list(range(100)), list(range(100)), []), 200)


if __name__ == "__main__":
    unittest.main()
