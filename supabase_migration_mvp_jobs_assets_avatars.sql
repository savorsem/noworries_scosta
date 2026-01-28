-- MVP schema additions: integrations (extensions), jobs, assets, avatars

-- Integrations table extension
alter table if exists public.integrations
  add column if not exists provider_id text;

alter table if exists public.integrations
  add column if not exists enabled boolean not null default false;

alter table if exists public.integrations
  add column if not exists base_url text;

alter table if exists public.integrations
  add column if not exists capabilities text[];

-- keep existing columns: auth_type, name, config, secret_enc, is_active etc.

create table if not exists public.assets (
  id uuid primary key,
  kind text not null check (kind in ('image','video','audio')),
  bucket text,
  path text,
  public_url text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.avatars (
  id uuid primary key,
  name text not null,
  primary_image_asset_id uuid references public.assets(id),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key,
  type text not null,
  status text not null,
  provider_id text not null,
  mode text not null,
  request jsonb not null default '{}'::jsonb,
  provider_job_id text,
  output_asset_id uuid references public.assets(id),
  error text,
  progress int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_provider_idx on public.jobs(provider_id);

-- NOTE: RLS policies intentionally omitted for "only for me" MVP.
-- If you later add Supabase Auth, enable RLS and add policies.
