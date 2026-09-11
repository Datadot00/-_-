-- Allow 'none' in projects.platform for survey without major category
-- and allow optional test credentials when login_required is true

alter table public.projects
  drop constraint if exists projects_platform_valid,
  drop constraint if exists projects_login_configuration_valid;

alter table public.projects
  add constraint projects_platform_valid check (
    platform in ('web', 'app', 'none')
  ),
  add constraint projects_login_configuration_valid check (
    (
      not login_required
      and test_account_id is null
      and test_account_pw is null
      and privacy_items is null
    )
    or (
      login_required
      and (
        (test_account_id is null and test_account_pw is null)
        or (
          nullif(btrim(test_account_id), '') is not null
          and char_length(test_account_id) <= 200
          and nullif(btrim(test_account_pw), '') is not null
          and char_length(test_account_pw) <= 200
        )
      )
      and nullif(btrim(privacy_items), '') is not null
      and char_length(privacy_items) <= 1000
    )
  );
