-- Private bucket: not exposed via public URL. Downloads use signed URLs.
insert into storage.buckets (id, name, public)
values ('contact-documents', 'contact-documents', false)
on conflict (id) do nothing;

-- Path layout: {organization_id}/{contact_id}/{timestamp}_{name}.{ext}
-- storage.foldername(name) splits on '/' — index [1] is the first segment.

create policy "members read contact documents"
  on storage.objects for select
  using (
    bucket_id = 'contact-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "members insert contact documents"
  on storage.objects for insert
  with check (
    bucket_id = 'contact-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "members update contact documents"
  on storage.objects for update
  using (
    bucket_id = 'contact-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "members delete contact documents"
  on storage.objects for delete
  using (
    bucket_id = 'contact-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );
