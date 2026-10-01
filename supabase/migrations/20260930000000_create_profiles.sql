-- Profiles for Qalamkar writers (run in Supabase SQL Editor)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  first_name text not null default '',
  last_name text not null default '',
  bio text not null default '',
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'ur', 'bal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 24),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]+$')
);

create unique index if not exists profiles_username_key on public.profiles (username);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix integer := 0;
begin
  base_username := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1)));
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '_', 'g');
  base_username := left(base_username, 24);
  if char_length(base_username) < 3 then
    base_username := 'writer';
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := left(base_username, 24 - char_length(suffix::text) - 1) || '_' || suffix;
  end loop;

  insert into public.profiles (id, username, first_name, last_name, preferred_language)
  values (
    new.id,
    final_username,
    coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), ''),
    coalesce(nullif(trim(new.raw_user_meta_data->>'last_name'), ''), ''),
    coalesce(nullif(trim(new.raw_user_meta_data->>'preferred_language'), ''), 'en')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any existing auth users
insert into public.profiles (id, username, first_name, last_name, preferred_language)
select
  u.id,
  left(
    coalesce(
      nullif(regexp_replace(lower(coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))), '[^a-z0-9_]', '_', 'g'), ''),
      'writer'
    ),
    24
  ) || '_' || substr(replace(u.id::text, '-', ''), 1, 6),
  coalesce(nullif(trim(u.raw_user_meta_data->>'first_name'), ''), ''),
  coalesce(nullif(trim(u.raw_user_meta_data->>'last_name'), ''), ''),
  coalesce(nullif(trim(u.raw_user_meta_data->>'preferred_language'), ''), 'en')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
