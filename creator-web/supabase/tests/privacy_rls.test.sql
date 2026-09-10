begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

select ok(has_column_privilege('anon', 'public.users', 'nickname', 'select'), 'anon can read public nickname');
select ok(not has_column_privilege('anon', 'public.users', 'email', 'select'), 'anon cannot read email');
select ok(not has_column_privilege('authenticated', 'public.users', 'email', 'select'), 'authenticated cannot enumerate emails');
select ok(not has_column_privilege('anon', 'public.users', 'phone', 'select'), 'anon cannot read phone');
select ok(not has_column_privilege('authenticated', 'public.users', 'sns_links', 'select'), 'authenticated cannot enumerate SNS links');
select ok(not has_column_privilege('anon', 'public.projects', 'test_account_id', 'select'), 'anon cannot read test account IDs');
select ok(not has_column_privilege('anon', 'public.projects', 'test_account_pw', 'select'), 'anon cannot read test passwords');
select ok(not has_column_privilege('authenticated', 'public.projects', 'test_account_pw', 'select'), 'authenticated cannot enumerate test passwords');
select ok(not has_column_privilege('anon', 'public.reviews', 'screenshot_url', 'select'), 'anon cannot read review screenshots');
select ok(not has_column_privilege('authenticated', 'public.reviews', 'quiz_answers', 'select'), 'authenticated cannot enumerate quiz answers');
select ok(not has_column_privilege('anon', 'public.reviews', 'participation_id', 'select'), 'anon cannot read internal participation IDs');
select ok(not has_table_privilege('anon', 'public.users', 'insert'), 'anon cannot insert profiles');
select ok(not has_table_privilege('anon', 'public.projects', 'update'), 'anon cannot update projects');
select ok(not has_table_privilege('authenticated', 'public.users', 'truncate'), 'authenticated cannot truncate profiles');
select ok(not has_column_privilege('authenticated', 'public.users', 'level', 'update'), 'users cannot promote their own level');
select ok(not has_column_privilege('authenticated', 'public.users', 'completed_test_count', 'update'), 'users cannot forge completed test counts');
select ok(has_table_privilege('authenticated', 'public.coin_wallets', 'select'), 'authenticated users retain wallet reads under RLS');

select * from finish();

rollback;
