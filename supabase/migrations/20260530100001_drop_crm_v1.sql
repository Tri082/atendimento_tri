-- Guard: refuse to run if contacts has data.
do $$
begin
  if exists (select 1 from public.contacts limit 1) then
    raise exception 'Aborting drop_crm_v1: contacts table is not empty. Manual review required.';
  end if;
end $$;

-- Drop tasks.contact_id first (will be recreated in 100006).
alter table public.tasks drop column if exists contact_id;

-- Drop the contacts table and its enum.
drop table if exists public.contacts cascade;
drop type if exists public.contact_stage cascade;

-- Storage policies for the v1 bucket.
drop policy if exists "members read contact documents" on storage.objects;
drop policy if exists "members insert contact documents" on storage.objects;
drop policy if exists "members update contact documents" on storage.objects;
drop policy if exists "members delete contact documents" on storage.objects;

-- NOTE: The storage bucket 'contact-documents' itself remains (Supabase blocks
-- direct DELETE on storage.buckets via SQL). It has no policies and no objects,
-- so it is effectively dead weight. Delete it manually via Supabase dashboard
-- if you want to fully clean up.
