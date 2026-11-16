import unittest

from resource_limits import bounded_page, chunks, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE


class ResourceLimitTests(unittest.TestCase):
    def test_page_defaults_and_caps(self):
        self.assertEqual(bounded_page(DEFAULT_PAGE_SIZE), (DEFAULT_PAGE_SIZE, 0))
        self.assertEqual(bounded_page(10_000, 25), (MAX_PAGE_SIZE, 25))

    def test_page_rejects_invalid_values(self):
        for limit, offset in [(0, 0), (-1, 0), (10, -1), ("bad", 0)]:
            with self.subTest(limit=limit, offset=offset):
                with self.assertRaises(ValueError):
                    bounded_page(limit, offset)

    def test_chunks_preserve_every_item_and_order(self):
        source = list(range(1003))
        batches = list(chunks(source, 200))
        self.assertEqual([len(batch) for batch in batches], [200, 200, 200, 200, 200, 3])
        self.assertEqual([item for batch in batches for item in batch], source)

    def test_chunks_support_generators(self):
        batches = list(chunks((value for value in range(7)), 3))
        self.assertEqual(batches, [[0, 1, 2], [3, 4, 5], [6]])


if __name__ == "__main__":
    unittest.main()
