-- Keep the private-profile RPC contract stable for future rows and admin writes.
alter table public.users
  alter column sns_links set not null;
