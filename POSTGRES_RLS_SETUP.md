# PostgreSQL tenant RLS deployment setup

P0-02 requires the API process to connect with a dedicated PostgreSQL runtime role. Do not run the API as postgres, service_role, a superuser, or a role with BYPASSRLS.

## 1. Apply schema migrations as a database administrator

Run from server/ using an administrator/migration connection:

    DATABASE_URL="$DATABASE_MIGRATION_URL" alembic upgrade head

The migration is additive: it adds nullable owner_user_id columns and indexes, enables and forces RLS on PostgreSQL, and retains an email-based compatibility path for pre-existing rows. It does not delete user data.

## 2. Create a restricted API runtime role

Run this in the Supabase SQL editor or as a PostgreSQL administrator. Replace the password with a unique, strong value:

    CREATE ROLE aether_app_runtime
      LOGIN PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    GRANT CONNECT ON DATABASE postgres TO aether_app_runtime;
    GRANT USAGE ON SCHEMA public TO aether_app_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON ALL TABLES IN SCHEMA public TO aether_app_runtime;
    GRANT USAGE, SELECT, UPDATE
      ON ALL SEQUENCES IN SCHEMA public TO aether_app_runtime;

If your Supabase project uses a different database name or pooler username format, use the values shown in Supabase connection settings.

Set Render DATABASE_URL to the connection string for aether_app_runtime, not the admin/postgres connection. Keep the admin connection for manual migrations only. The API startup check intentionally refuses PostgreSQL roles that are superusers or have BYPASSRLS.

## 3. Configure Supabase Auth

Set these Render environment variables to the same project used by desktop/src/supabase.js:
- SUPABASE_URL
- SUPABASE_ANON_KEY

The backend validates each protected API Bearer token against Supabase Auth and derives the user UUID and email from the verified response. X-User-Email is not an identity source.

## 4. Secure the reminder worker

Generate a separate random secret with: openssl rand -hex 32

Set the exact same value in:
- Render environment variable AETHER_WORKER_TOKEN
- GitHub repository Actions secret AETHER_WORKER_TOKEN

The GitHub keep-alive workflow uses this secret to call /api/reminders/push-check. Do not reuse the Supabase anon key, service-role key, or a user access token.

## 5. Deployment order

1. Apply the migration using the admin connection.
2. Create the restricted runtime role and grant table/sequence privileges.
3. Update Render DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, and AETHER_WORKER_TOKEN.
4. Add the GitHub Actions secret AETHER_WORKER_TOKEN.
5. Deploy the reviewed PR only after PostgreSQL RLS CI passes.
6. Verify login, task/finance/memory CRUD, Telegram/WhatsApp flows, and the scheduled reminder worker in staging before production.

The CI PostgreSQL suite uses a non-superuser, NOBYPASSRLS runtime role and exercises cross-tenant reads, updates, deletes, spoofed owner/email inserts, transaction context reset, webhook pairing access, and the explicit worker context.