create table if not exists public.workspace_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_name text not null,
  record_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, collection_name, record_id),
  constraint workspace_records_collection_check check (
    collection_name in (
      'settings',
      'leads',
      'interactions',
      'tasks',
      'scripts',
      'resources',
      'webinars',
      'webinar_pages',
      'webinar_registrations',
      'payments',
      'content_posts',
      'referrals',
      'events',
      'utm_links',
      'qr_codes',
      'products',
      'product_imports',
      'orders',
      'order_items',
      'bundles',
      'bundle_items'
    )
  )
);

create index if not exists workspace_records_user_collection_idx
  on public.workspace_records (user_id, collection_name);

create or replace function public.set_workspace_records_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspace_records_set_updated_at on public.workspace_records;

create trigger workspace_records_set_updated_at
before update on public.workspace_records
for each row
execute function public.set_workspace_records_updated_at();

alter table public.workspace_records enable row level security;

drop policy if exists "workspace_records_select_own" on public.workspace_records;
create policy "workspace_records_select_own"
on public.workspace_records
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "workspace_records_insert_own" on public.workspace_records;
create policy "workspace_records_insert_own"
on public.workspace_records
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "workspace_records_update_own" on public.workspace_records;
create policy "workspace_records_update_own"
on public.workspace_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "workspace_records_delete_own" on public.workspace_records;
create policy "workspace_records_delete_own"
on public.workspace_records
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.workspace_records from anon;
revoke all on public.workspace_records from authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.workspace_records to authenticated;
