-- Migration-history marker for the seed migration applied before the repository
-- adopted local Supabase migrations. The shared production project already ran
-- this version; canonical seed rows remain documented in supabase_schema.sql.
-- Intentionally no-op to prevent duplicated historical seed writes.

select 1;
