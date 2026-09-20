// Produce an atomic, reviewable release SQL and a rollback-only rehearsal.
// This script only writes ignored local files; it never connects to a database.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const migrations = [
  '20260920190000_add_project_drafts.sql',
  '20260920200000_reconcile_review_verification.sql',
  '20260920210000_require_review_moderation.sql',
  '20260920220000_fix_review_screenshot_evidence.sql'
];
const quote = value => `'${value.replaceAll("'", "''")}'`;
const versions = migrations.map(file => quote(file.slice(0, 14))).join(',');
let sql = `begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $$ begin
  if not pg_try_advisory_xact_lock(20260920, 2100) then raise exception 'release already running'; end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version in (${versions})) then
    raise exception 'release migration already recorded; inspect before rerunning';
  end if;
end $$;
`;
for (const file of migrations) {
  const source = readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
  sql += `\n-- ${file}\n${source.replace(/^\s*(?:begin|commit);\s*$/gim, '')}\n`;
  const name = file.slice(15, -4);
  sql += `insert into supabase_migrations.schema_migrations(version,name,statements) values (${quote(file.slice(0,14))},${quote(name)},array[${quote(source)}]);\n`;
}
sql += "notify pgrst, 'reload schema';\n";
const directory = new URL('../supabase/.temp/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('review-release-rehearsal.sql', directory), sql + 'rollback;\n');
writeFileSync(new URL('review-release.sql', directory), sql + 'commit;\n');
console.log(`Prepared ${migrations.length} migrations with atomic history recording; rehearsal always rolls back.`);
