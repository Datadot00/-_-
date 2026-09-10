-- Public reviews expose display content, not private evidence or quiz answers.

revoke select on table public.reviews from anon, authenticated;

grant select (
  id, project_id, user_id, rating, reuse_intention, answers,
  creator_reply, creator_replied_at, status, created_at
) on table public.reviews to anon, authenticated;

do $$
begin
  if has_column_privilege('anon', 'public.reviews', 'screenshot_url', 'select')
    or has_column_privilege('authenticated', 'public.reviews', 'screenshot_url', 'select')
    or has_column_privilege('anon', 'public.reviews', 'quiz_answers', 'select')
    or has_column_privilege('authenticated', 'public.reviews', 'quiz_answers', 'select')
    or has_column_privilege('anon', 'public.reviews', 'participation_id', 'select')
  then
    raise exception 'review privacy hardening failed: a sensitive review column remains readable';
  end if;
end;
$$;
