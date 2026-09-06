-- Durable, workspace-scoped WAAS deployment queue. The document record keeps
-- operator-facing metadata while this typed table provides concurrency,
-- idempotency and crash recovery guarantees.
create table if not exists public.waas_deployment_jobs (
  deployment_id text primary key,
  workspace_id text not null references public.bos_workspaces(id) on delete cascade,
  order_id text not null,
  status text not null default 'queued'
    check (status in ('queued','leased','complete','failed','cancelled')),
  worker_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, order_id)
);

create index if not exists waas_deployment_jobs_claim_idx
  on public.waas_deployment_jobs (status, available_at, lease_expires_at, created_at);

alter table public.waas_deployment_jobs enable row level security;

drop policy if exists waas_deployment_jobs_operator_select on public.waas_deployment_jobs;
create policy waas_deployment_jobs_operator_select
  on public.waas_deployment_jobs for select to authenticated
  using (exists (
    select 1 from public.bos_workspace_members m
    where m.workspace_id = waas_deployment_jobs.workspace_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('workspace_admin','super_admin','operations')
  ));

create or replace function public.ensure_waas_deployment_job(
  p_workspace_id text,
  p_order_id text,
  p_deployment_id text
) returns public.waas_deployment_jobs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.waas_deployment_jobs;
begin
  insert into public.waas_deployment_jobs (
    deployment_id, workspace_id, order_id, status, available_at
  ) values (
    p_deployment_id, p_workspace_id, p_order_id, 'queued', now()
  )
  on conflict (workspace_id, order_id) do update
    set updated_at = now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.claim_waas_deployment_job(
  p_workspace_id text,
  p_deployment_id text,
  p_worker_id text,
  p_lease_seconds integer default 180
) returns public.waas_deployment_jobs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.waas_deployment_jobs;
begin
  update public.waas_deployment_jobs
  set status = 'leased',
      worker_id = p_worker_id,
      attempt_count = attempt_count + 1,
      lease_expires_at = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 900))),
      last_error = null,
      updated_at = now()
  where workspace_id = p_workspace_id
    and deployment_id = p_deployment_id
    and available_at <= now()
    and (
      status in ('queued','failed')
      or (status = 'leased' and lease_expires_at < now())
    )
  returning * into result;
  return result;
end;
$$;

revoke all on function public.ensure_waas_deployment_job(text,text,text) from public, anon, authenticated;
revoke all on function public.claim_waas_deployment_job(text,text,text,integer) from public, anon, authenticated;
grant execute on function public.ensure_waas_deployment_job(text,text,text) to service_role;
grant execute on function public.claim_waas_deployment_job(text,text,text,integer) to service_role;

revoke all on table public.waas_deployment_jobs from anon;
grant select on table public.waas_deployment_jobs to authenticated;
grant all on table public.waas_deployment_jobs to service_role;

comment on table public.waas_deployment_jobs is
  'Durable WAAS deployment queue with one job per workspace/order and expiring worker leases.';
