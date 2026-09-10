-- Normalize the legacy empty-object SNS default to the array shape used by My Info.
-- The production audit before this migration confirmed every object value was empty.

update public.users
set sns_links = '[]'::jsonb
where sns_links is null
   or jsonb_typeof(sns_links) <> 'array';

alter table public.users
  alter column sns_links set default '[]'::jsonb;

alter table public.users
  drop constraint if exists users_sns_links_array;

alter table public.users
  add constraint users_sns_links_array
  check (
    jsonb_typeof(sns_links) = 'array'
    and jsonb_array_length(sns_links) <= 5
  );
