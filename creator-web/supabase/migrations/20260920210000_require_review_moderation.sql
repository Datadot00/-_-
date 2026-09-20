-- Review text policy is separate from creator approval. Rejected text is never
-- inserted into reviews, and only a server-issued, content-bound pass can pay.
begin;

create table private.review_moderation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  payload_hash bytea not null check (octet_length(payload_hash) = 32),
  policy_version text not null,
  decision text not null default 'pending'
    check (decision in ('pending', 'pass', 'revise', 'uncertain', 'error', 'consumed')),
  categories text[] not null default '{}'
    check (categories <@ array['profanity', 'sexual', 'phone', 'external_solicitation']::text[]),
  model text,
  created_at timestamptz not null default now(),
  checked_at timestamptz,
  review_id uuid references public.reviews(id) on delete set null,
  submission_result jsonb
);
create index review_moderation_user_time on private.review_moderation_attempts(user_id, created_at desc);
alter table private.review_moderation_attempts enable row level security;
revoke all on private.review_moderation_attempts from public, anon, authenticated, service_role;

create function public.begin_review_moderation(p_user_id uuid, p_payload jsonb, p_policy_version text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_project_id uuid := (p_payload ->> 'p_project_id')::uuid;
  v_status text;
  v_id uuid;
begin
  if p_user_id is null or p_policy_version is distinct from 'review-v1-2026-09-20'
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or length(p_payload::text) > 3100000
  then
    raise exception 'invalid moderation request' using errcode = '22023';
  end if;

  select participation.status into v_status
  from public.participations as participation
  join public.projects as project on project.id = participation.project_id
  where participation.user_id = p_user_id and participation.project_id = v_project_id
    and project.creator_id <> p_user_id;
  if not found then
    raise exception 'active participation not found' using errcode = '42501';
  end if;
  if v_status not in ('applied', 'in_progress') then
    raise exception 'review was already submitted' using errcode = '23505';
  end if;

  -- Serialize each user's quota reservation across concurrent Edge instances.
  perform pg_advisory_xact_lock(hashtextextended('review-moderation:' || p_user_id::text, 0));
  if (select count(*) from private.review_moderation_attempts
      where user_id = p_user_id and created_at > now() - interval '1 minute') >= 5
    or (select count(*) from private.review_moderation_attempts
      where user_id = p_user_id and created_at > now() - interval '1 day') >= 50
  then
    raise exception 'review moderation rate limit' using errcode = 'P0001';
  end if;

  insert into private.review_moderation_attempts(user_id, project_id, payload_hash, policy_version)
  values (p_user_id, v_project_id, sha256(convert_to(p_payload::text, 'UTF8')), p_policy_version)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.finish_review_moderation(p_attempt_id uuid, p_decision text, p_categories text[], p_model text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_decision is null or p_decision not in ('pass', 'revise', 'uncertain', 'error')
    or p_categories is null
    or not (p_categories <@ array['profanity', 'sexual', 'phone', 'external_solicitation']::text[])
    or (p_decision = 'pass' and cardinality(p_categories) <> 0)
    or (p_decision = 'revise' and cardinality(p_categories) = 0)
    or p_model is null or length(p_model) not between 1 and 100
  then
    raise exception 'invalid moderation decision' using errcode = '22023';
  end if;
  update private.review_moderation_attempts
  set decision = p_decision, categories = p_categories, model = p_model, checked_at = now()
  where id = p_attempt_id and decision = 'pending' and created_at > now() - interval '5 minutes';
  if not found then
    raise exception 'moderation attempt expired or finalized' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.begin_review_moderation(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.finish_review_moderation(uuid, text, text[], text) from public, anon, authenticated;
grant execute on function public.begin_review_moderation(uuid, jsonb, text) to service_role;
grant execute on function public.finish_review_moderation(uuid, text, text[], text) to service_role;

-- Keep the existing transaction, quiz trigger and welcome-bonus logic intact.
-- Moving the original function removes the old seven-argument API bypass.
alter function public.submit_project_review(uuid, numeric, boolean, jsonb, jsonb, boolean, text) set schema private;
revoke all on function private.submit_project_review(uuid, numeric, boolean, jsonb, jsonb, boolean, text)
  from public, anon, authenticated, service_role;

create function public.submit_project_review(
  p_project_id uuid,
  p_rating numeric,
  p_reuse_intention boolean default true,
  p_answers jsonb default '{}'::jsonb,
  p_quiz_answers jsonb default '{}'::jsonb,
  p_is_quiz_passed boolean default true,
  p_screenshot_url text default null,
  p_moderation_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt private.review_moderation_attempts%rowtype;
  v_payload jsonb;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  v_payload := jsonb_build_object(
    'p_project_id', p_project_id, 'p_rating', p_rating,
    'p_reuse_intention', p_reuse_intention, 'p_answers', p_answers,
    'p_quiz_answers', p_quiz_answers, 'p_is_quiz_passed', p_is_quiz_passed,
    'p_screenshot_url', p_screenshot_url
  );
  select * into v_attempt from private.review_moderation_attempts
  where id = p_moderation_id for update;
  if not found then
    raise exception 'review moderation required' using errcode = '42501';
  end if;
  if v_attempt.user_id <> v_user_id or v_attempt.project_id <> p_project_id
    or v_attempt.payload_hash <> sha256(convert_to(v_payload::text, 'UTF8'))
    or v_attempt.policy_version <> 'review-v1-2026-09-20'
  then
    raise exception 'review moderation payload mismatch' using errcode = '42501';
  end if;
  if v_attempt.decision = 'consumed' then
    return v_attempt.submission_result;
  end if;
  if v_attempt.decision <> 'pass' or v_attempt.created_at <= now() - interval '5 minutes' then
    raise exception 'review moderation pass required' using errcode = '42501';
  end if;

  v_result := private.submit_project_review(
    p_project_id, p_rating, p_reuse_intention, p_answers,
    p_quiz_answers, p_is_quiz_passed, p_screenshot_url
  );
  update private.review_moderation_attempts
  set decision = 'consumed', review_id = (v_result ->> 'review_id')::uuid, submission_result = v_result
  where id = p_moderation_id;
  return v_result;
end;
$$;

revoke all on function public.submit_project_review(uuid, numeric, boolean, jsonb, jsonb, boolean, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_project_review(uuid, numeric, boolean, jsonb, jsonb, boolean, text, uuid)
  to authenticated;

-- No direct insert or post-approval text edit can bypass the gate.
revoke insert, update on public.reviews from public, anon, authenticated;
revoke update (answers, rating, reuse_intention, quiz_answers, screenshot_url, is_quiz_passed)
  on public.reviews from public, anon, authenticated;
grant update (creator_reply, creator_replied_at, status) on public.reviews to authenticated;

comment on table private.review_moderation_attempts is
  'Private moderation audit: hashes and category codes only, no rejected review text, phone numbers or provider response.';

commit;
