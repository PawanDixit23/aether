import unittest

from database import _parse_add_column_target


class MigrationColumnParserTests(unittest.TestCase):
    def test_parses_plain_add_column(self):
        self.assertEqual(
            _parse_add_column_target("ALTER TABLE tasks ADD COLUMN recurrence VARCHAR"),
            ("tasks", "recurrence"),
        )

    def test_parses_postgres_add_column_if_not_exists(self):
        self.assertEqual(
            _parse_add_column_target(
                "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence VARCHAR"
            ),
            ("tasks", "recurrence"),
        )

    def test_parses_defaulted_column(self):
        self.assertEqual(
            _parse_add_column_target(
                "ALTER TABLE chat_messages ADD COLUMN session_id VARCHAR DEFAULT 'default'"
            ),
            ("chat_messages", "session_id"),
        )

    def test_ignores_non_add_column_statements(self):
        self.assertIsNone(_parse_add_column_target("ALTER TABLE tasks ENABLE ROW LEVEL SECURITY"))
        self.assertIsNone(_parse_add_column_target("CREATE INDEX ix_tasks ON tasks (id)"))


if __name__ == "__main__":
    unittest.main()
