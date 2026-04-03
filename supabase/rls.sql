-- RLS setup for schema without Supabase Auth linkage.
-- Disable RLS so anon client operations can work with the current users/password table flow.

alter table users disable row level security;
alter table interests disable row level security;
alter table user_interests disable row level security;
