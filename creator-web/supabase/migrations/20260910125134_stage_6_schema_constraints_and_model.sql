-- Stage 6: align schema constraints with the service data model.

-- Registration eligibility is derived from completed reviews, never a separate
-- client-controlled flag. The previous values are preserved by migration 014.
update public.users
set has_passed_gating = (completed_test_count >= 3),
    updated_at = now()
where has_passed_gating is distinct from (completed_test_count >= 3);

alter table public.users
  drop constraint if exists users_email_valid,
  drop constraint if exists users_profile_values_valid,
  drop constraint if exists users_gating_consistent,
  drop constraint if exists users_avatar_url_http_check;
alter table public.users
  add constraint users_email_valid check (
    btrim(email) <> ''
    and char_length(email) <= 320
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  add constraint users_profile_values_valid check (
    btrim(nickname) <> ''
    and char_length(nickname) <= 50
    and (bio is null or char_length(bio) <= 1000)
    and level >= 1
    and completed_test_count >= 0
    and btrim(rank_badge) <> ''
    and char_length(rank_badge) <= 50
    and (interests is null or cardinality(interests) <= 20)
  ),
  add constraint users_gating_consistent check (
    has_passed_gating = (completed_test_count >= 3)
  ),
  add constraint users_avatar_url_http_check check (
    avatar_url is null
    or (char_length(avatar_url) <= 2048 and avatar_url ~* '^https?://[^[:space:]]+$')
  );

create unique index if not exists idx_users_email_normalized_unique
  on public.users (lower(btrim(email)));

alter table public.projects
  drop constraint if exists projects_category_valid,
  drop constraint if exists projects_platform_valid,
  drop constraint if exists projects_status_valid,
  drop constraint if exists projects_content_lengths_valid,
  drop constraint if exists projects_json_shapes_valid,
  drop constraint if exists projects_destination_valid,
  drop constraint if exists projects_login_configuration_valid;
alter table public.projects
  add constraint projects_category_valid check (
    category in ('product', 'prototype', 'vote', 'survey', 'abtest')
  ),
  add constraint projects_platform_valid check (platform in ('web', 'app')),
  add constraint projects_status_valid check (
    status in ('reviewing', 'recruiting', 'completed', 'paused')
  ),
  add constraint projects_content_lengths_valid check (
    char_length(title) <= 120
    and char_length(service_name) <= 80
    and char_length(service_desc) <= 5000
    and char_length(test_notice) <= 5000
    and char_length(test_guide) <= 5000
    and char_length(duration) between 1 and 50
    and (tech_tags is null or cardinality(tech_tags) <= 20)
  ),
  add constraint projects_json_shapes_valid check (
    jsonb_typeof(questions) = 'array'
    and jsonb_array_length(questions) <= 50
    and jsonb_typeof(quizzes) = 'array'
    and jsonb_array_length(quizzes) <= 50
  ),
  add constraint projects_destination_valid check (
    category not in ('product', 'prototype')
    or coalesce(
      nullif(btrim(service_url), ''),
      nullif(btrim(app_playstore_url), ''),
      nullif(btrim(app_appstore_url), '')
    ) is not null
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
      and nullif(btrim(test_account_id), '') is not null
      and char_length(test_account_id) <= 200
      and nullif(btrim(test_account_pw), '') is not null
      and char_length(test_account_pw) <= 200
      and nullif(btrim(privacy_items), '') is not null
      and char_length(privacy_items) <= 1000
    )
  );

alter table public.participations
  drop constraint if exists participations_completion_consistent;
alter table public.participations
  add constraint participations_completion_consistent check (
    (
      status in ('applied', 'in_progress')
      and completed_at is null
    )
    or (
      status in ('submitted', 'approved', 'rejected')
      and completed_at is not null
      and completed_at >= applied_at
    )
  );

-- Reviews duplicate project/user columns for efficient reads. A composite FK
-- prevents those copies from ever disagreeing with the participation owner.
alter table public.reviews
  drop constraint if exists reviews_participation_identity_fkey;
alter table public.participations
  drop constraint if exists participations_identity_unique;
alter table public.participations
  add constraint participations_identity_unique
    unique (id, project_id, user_id);
alter table public.reviews
  add constraint reviews_participation_identity_fkey
    foreign key (participation_id, project_id, user_id)
    references public.participations (id, project_id, user_id)
    on delete cascade;

alter table public.reviews
  drop constraint if exists reviews_json_shapes_valid,
  drop constraint if exists reviews_screenshot_url_http_check,
  drop constraint if exists reviews_reply_consistent;
alter table public.reviews
  add constraint reviews_json_shapes_valid check (
    jsonb_typeof(answers) in ('object', 'array')
    and (
      quiz_answers is null
      or jsonb_typeof(quiz_answers) in ('object', 'array')
    )
  ),
  add constraint reviews_screenshot_url_http_check check (
    screenshot_url is null
    or (char_length(screenshot_url) <= 2048 and screenshot_url ~* '^https?://[^[:space:]]+$')
  ),
  add constraint reviews_reply_consistent check (
    (creator_reply is null and creator_replied_at is null)
    or (
      nullif(btrim(creator_reply), '') is not null
      and char_length(creator_reply) <= 5000
      and creator_replied_at is not null
      and creator_replied_at >= created_at
    )
  );

alter table public.coin_transactions
  drop constraint if exists coin_transactions_type_valid,
  drop constraint if exists coin_transactions_reference_consistent,
  drop constraint if exists coin_transactions_description_valid,
  drop constraint if exists coin_transactions_direction_valid;
alter table public.coin_transactions
  add constraint coin_transactions_type_valid check (
    type in ('reward_earned', 'project_funding', 'shop_purchase', 'refund')
  ),
  add constraint coin_transactions_reference_consistent check (
    (reference_type is null) = (reference_id is null)
  ),
  add constraint coin_transactions_description_valid check (
    btrim(description) <> '' and char_length(description) <= 500
  ),
  add constraint coin_transactions_direction_valid check (
    (type in ('reward_earned', 'refund') and amount > 0)
    or (type in ('project_funding', 'shop_purchase') and amount < 0)
  );

alter table public.marketplace_items
  drop constraint if exists marketplace_items_text_valid;
alter table public.marketplace_items
  add constraint marketplace_items_text_valid check (
    btrim(id) <> '' and char_length(id) <= 100
    and btrim(name) <> '' and char_length(name) <= 200
    and btrim(category) <> '' and char_length(category) <= 100
  );

alter table public.marketplace_exchanges
  drop constraint if exists marketplace_exchanges_voucher_valid;
alter table public.marketplace_exchanges
  add constraint marketplace_exchanges_voucher_valid check (
    status <> 'completed'
    or (
      nullif(btrim(voucher_code), '') is not null
      and char_length(voucher_code) <= 100
    )
  );
create unique index if not exists idx_marketplace_exchanges_voucher_unique
  on public.marketplace_exchanges (voucher_code)
  where voucher_code is not null;

alter table public.notifications
  drop constraint if exists notifications_type_valid,
  drop constraint if exists notifications_content_valid;
alter table public.notifications
  add constraint notifications_type_valid check (
    type in ('new_review', 'app_update', 'reply', 'approval', 'recommendation', 'shop_new')
  ),
  add constraint notifications_content_valid check (
    btrim(title) <> '' and char_length(title) <= 120
    and btrim(message) <> '' and char_length(message) <= 1000
    and (target_url is null or char_length(target_url) <= 2048)
  );

alter table public.support_tickets
  drop constraint if exists support_tickets_timestamps_valid,
  drop constraint if exists support_tickets_admin_reply_valid;
alter table public.support_tickets
  add constraint support_tickets_timestamps_valid check (
    updated_at >= created_at
    and (resolved_at is null or resolved_at >= created_at)
  ),
  add constraint support_tickets_admin_reply_valid check (
    admin_reply is null
    or (nullif(btrim(admin_reply), '') is not null and char_length(admin_reply) <= 5000)
  );

comment on constraint users_gating_consistent on public.users is
  'Project registration eligibility is derived from at least three completed reviews.';
comment on constraint reviews_participation_identity_fkey on public.reviews is
  'Keeps denormalized review project/user identifiers equal to the participation owner.';
comment on constraint coin_transactions_reference_consistent on public.coin_transactions is
  'A ledger cause type and cause UUID must either both exist or both be absent.';
