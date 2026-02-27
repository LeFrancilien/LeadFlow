-- Scraping jobs table
create table scraping_jobs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  name text not null,
  source_type text not null default 'google_maps',
  config jsonb not null default '{}',
  status text not null check (status in ('pending', 'running', 'completed', 'failed')) default 'pending',
  results jsonb default '[]'::jsonb,
  total_results integer default 0,
  imported_results integer default 0,
  error text,
  started_at timestamptz,
  completed_at timestamptz
);

-- Enrichment logs table
create table enrichment_logs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  lead_id uuid references leads(id) on delete cascade,
  provider text not null,
  data jsonb default '{}'::jsonb,
  status text not null check (status in ('success', 'error', 'skipped')) default 'success'
);

-- Add email_verified column to leads for NeverBounce results
alter table leads add column if not exists email_verified text check (email_verified in ('valid', 'invalid', 'disposable', 'unknown'));

-- Add enriched_at column to leads to track last enrichment
alter table leads add column if not exists enriched_at timestamptz;

-- Indexes
create index scraping_jobs_status_idx on scraping_jobs (status);
create index scraping_jobs_created_at_idx on scraping_jobs (created_at);
create index enrichment_logs_lead_id_idx on enrichment_logs (lead_id);
create index enrichment_logs_provider_idx on enrichment_logs (provider);

-- RLS
alter table scraping_jobs enable row level security;
alter table enrichment_logs enable row level security;

create policy "Authenticated users can do everything on scraping_jobs"
  on scraping_jobs for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can do everything on enrichment_logs"
  on enrichment_logs for all
  to authenticated
  using (true)
  with check (true);
