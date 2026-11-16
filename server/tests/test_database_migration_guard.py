import unittest
from unittest.mock import patch

from sqlalchemy import create_engine

import database
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

    def test_startup_migration_runs_only_once_for_a_version(self):
        test_engine = create_engine("sqlite:///:memory:")
        try:
            with patch.object(database, "engine", test_engine), patch.object(
                database, "_run_schema_migrations_once"
            ) as migration:
                database.ensure_schema_migrations()
                database.ensure_schema_migrations()
                self.assertEqual(migration.call_count, 1)
        finally:
            test_engine.dispose()

    def test_failed_migration_is_not_marked_applied_and_can_retry(self):
        test_engine = create_engine("sqlite:///:memory:")
        try:
            with patch.object(database, "engine", test_engine), patch.object(
                database, "_run_schema_migrations_once",
                side_effect=[RuntimeError("simulated migration failure"), None],
            ) as migration:
                with self.assertRaises(RuntimeError):
                    database.ensure_schema_migrations()
                database.ensure_schema_migrations()
                database.ensure_schema_migrations()
                self.assertEqual(migration.call_count, 2)
        finally:
            test_engine.dispose()


if __name__ == "__main__":
    unittest.main()
