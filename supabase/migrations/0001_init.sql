-- STD (Société Tunisienne de Décoration) — core schema: profiles + quotes.
-- Apply with: supabase db push  (or paste into the Supabase SQL editor).

-- The one email that is auto-promoted to admin the first time it signs up.
-- To change the admin later, update the role on their profiles row directly.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  job_title text,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  message text,
  status text not null default 'pending' check (status in ('pending', 'answered')),
  reply text,
  replied_at timestamptz,
  replied_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists quotes_user_id_idx on public.quotes (user_id);
create index if not exists quotes_status_idx on public.quotes (status);

-- Creates the profile row right after Supabase Auth creates the user,
-- reading full_name / job_title out of the signup metadata. The one
-- hardcoded admin email is how "init the admin" works: they just sign up
-- once through the normal form and this trigger promotes them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, job_title, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'job_title',
    case when lower(new.email) = 'lachkarkacem@gmail.com' then 'admin' else 'client' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- is_admin() is security definer so it can read profiles without recursing
-- through the RLS policy that itself calls is_admin().
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.quotes enable row level security;

create policy "profiles: read own or admin reads all"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: user updates own row"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "quotes: read own or admin reads all"
  on public.quotes for select
  using (user_id = auth.uid() or public.is_admin());

create policy "quotes: user creates own quote"
  on public.quotes for insert
  with check (user_id = auth.uid());

create policy "quotes: admin replies to any quote"
  on public.quotes for update
  using (public.is_admin())
  with check (public.is_admin());
