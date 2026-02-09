-- Enable RLS and add permissive policies for authenticated users

alter table if exists public.login_history enable row level security;
alter table if exists public.user_sessions enable row level security;

-- login_history policies
 drop policy if exists "authenticated_all" on public.login_history;
 drop policy if exists "authenticated_full_access_login_history" on public.login_history;
 drop policy if exists "Allow authenticated users" on public.login_history;

create policy "login_history_authenticated_select"
  on public.login_history
  for select
  to authenticated
  using (true);

create policy "login_history_authenticated_insert"
  on public.login_history
  for insert
  to authenticated
  with check (true);

create policy "login_history_authenticated_update"
  on public.login_history
  for update
  to authenticated
  using (true)
  with check (true);

create policy "login_history_authenticated_delete"
  on public.login_history
  for delete
  to authenticated
  using (true);

-- user_sessions policies
 drop policy if exists "authenticated_all" on public.user_sessions;
 drop policy if exists "authenticated_full_access_user_sessions" on public.user_sessions;
 drop policy if exists "Allow authenticated users" on public.user_sessions;

create policy "user_sessions_authenticated_select"
  on public.user_sessions
  for select
  to authenticated
  using (true);

create policy "user_sessions_authenticated_insert"
  on public.user_sessions
  for insert
  to authenticated
  with check (true);

create policy "user_sessions_authenticated_update"
  on public.user_sessions
  for update
  to authenticated
  using (true)
  with check (true);

create policy "user_sessions_authenticated_delete"
  on public.user_sessions
  for delete
  to authenticated
  using (true);
