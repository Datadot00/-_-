# Supabase migration workflow

The SQL filenames in `migrations/` match the versions already recorded by the shared Supabase project. Keep each version immutable after it has been applied.

## Team workflow

1. Pull the latest repository changes.
2. Use the shared Supabase project through the frontend environment variables.
3. Do not reapply migrations already listed by the remote project.
4. Create a new timestamped migration for every future schema change.
5. Test locally, then apply the migration once through the database owner account.
6. Commit the SQL file in the same change as the application code that depends on it.

`20260909171123_seed_home_projects_for_existing_user.sql` is a no-op history marker because that seed was applied before local migration files were adopted. `supabase_schema.sql` is the current schema snapshot, but it also contains project-specific seed data and must be reviewed before provisioning a different Supabase project.

Database migrations must not be executed automatically from a public browser build or from Vercel. Production migration authority remains with the database owner.
