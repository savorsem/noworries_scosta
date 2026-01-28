-- Integrations table (secrets stored server-side via service role)

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  auth_type text not null check (auth_type in ('api_key','oauth')),
  name text not null,
  is_active boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  secret_enc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integrations_provider_idx on public.integrations(provider);
create index if not exists integrations_active_idx on public.integrations(provider, is_active);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_integrations_updated_at on public.integrations;
create trigger set_integrations_updated_at
before update on public.integrations
for each row execute procedure public.set_updated_at();

alter table public.integrations enable row level security;

-- No policies added intentionally: client (anon) cannot read/write.
-- Serverless API uses Service Role key and bypasses RLS.
