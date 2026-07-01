-- Bucket pra logos de organização
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

-- Policies org-logos: admins/owners da org só mexem nos logos da org (path = {org_id}/...)
create policy "org-logos public read"
  on storage.objects for select
  using (bucket_id = 'org-logos');

create policy "org-logos admins insert"
  on storage.objects for insert
  with check (
    bucket_id = 'org-logos'
    and public.has_org_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin']::public.org_role[]
    )
  );

create policy "org-logos admins update"
  on storage.objects for update
  using (
    bucket_id = 'org-logos'
    and public.has_org_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin']::public.org_role[]
    )
  );

create policy "org-logos admins delete"
  on storage.objects for delete
  using (
    bucket_id = 'org-logos'
    and public.has_org_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin']::public.org_role[]
    )
  );

