-- Private bucket for onboarding/support assets. Uploads are issued through
-- server-created signed URLs; the bucket is never public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('waas-assets', 'waas-assets', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/svg+xml','application/pdf']::text[])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists waas_assets_storage_select on storage.objects;
create policy waas_assets_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'waas-assets' and exists (
    select 1 from public.bos_workspace_members m
    where m.workspace_id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid()) and m.status = 'active'
  ));

drop policy if exists waas_assets_storage_write on storage.objects;
create policy waas_assets_storage_write on storage.objects for all to authenticated
  using (bucket_id = 'waas-assets' and exists (
    select 1 from public.bos_workspace_members m
    where m.workspace_id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('workspace_admin','super_admin','operations','support')
  ))
  with check (bucket_id = 'waas-assets' and exists (
    select 1 from public.bos_workspace_members m
    where m.workspace_id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('workspace_admin','super_admin','operations','support')
  ));
