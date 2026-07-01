insert into storage.buckets (id, name, public) values
  ('deal-documents', 'deal-documents', false),
  ('company-documents', 'company-documents', false)
on conflict (id) do nothing;

-- deal-documents policies
create policy "members read deal documents"
  on storage.objects for select
  using (
    bucket_id = 'deal-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "members insert deal documents"
  on storage.objects for insert
  with check (
    bucket_id = 'deal-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "members update deal documents"
  on storage.objects for update
  using (
    bucket_id = 'deal-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "members delete deal documents"
  on storage.objects for delete
  using (
    bucket_id = 'deal-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

-- company-documents policies
create policy "members read company documents"
  on storage.objects for select
  using (
    bucket_id = 'company-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "members insert company documents"
  on storage.objects for insert
  with check (
    bucket_id = 'company-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "members update company documents"
  on storage.objects for update
  using (
    bucket_id = 'company-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "members delete company documents"
  on storage.objects for delete
  using (
    bucket_id = 'company-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );
