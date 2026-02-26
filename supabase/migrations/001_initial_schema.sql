-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Leads table
create table leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  type text not null check (type in ('B2B', 'B2C')) default 'B2B',
  source text not null check (source in ('scraping', 'landing_page', 'import', 'manual')) default 'manual',
  status text not null check (status in ('new', 'contacted', 'qualified', 'converted', 'lost')) default 'new',
  score integer default 0 check (score >= 0 and score <= 100),
  first_name text,
  last_name text,
  email text,
  phone text,
  company_name text,
  job_title text,
  siren text,
  siret text,
  company_size text,
  revenue text,
  sector text,
  address text,
  city text,
  postal_code text,
  country text default 'France',
  website text,
  linkedin_url text,
  twitter_url text,
  facebook_url text,
  technologies jsonb default '[]'::jsonb,
  tags text[] default '{}',
  notes text,
  raw_data jsonb default '{}'::jsonb
);

-- Imports table
create table imports (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  filename text not null,
  file_url text,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  total_rows integer default 0,
  imported_rows integer default 0,
  duplicates integer default 0,
  errors jsonb default '[]'::jsonb
);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

-- Indexes
create index leads_email_idx on leads (email);
create index leads_status_idx on leads (status);
create index leads_source_idx on leads (source);
create index leads_type_idx on leads (type);
create index leads_score_idx on leads (score);
create index leads_created_at_idx on leads (created_at);
create index leads_company_name_idx on leads (company_name);
create index leads_siren_idx on leads (siren);

-- RLS
alter table leads enable row level security;
alter table imports enable row level security;

create policy "Authenticated users can do everything on leads"
  on leads for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can do everything on imports"
  on imports for all
  to authenticated
  using (true)
  with check (true);
