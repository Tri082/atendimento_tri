-- Habilita Realtime nas tabelas (Supabase respeita RLS na subscription)
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- Bucket de Storage pra mídia de mensagens
insert into storage.buckets (id, name, public)
values ('messaging', 'messaging', false)
on conflict (id) do nothing;

-- Policies de Storage espelhando RLS das mensagens.
-- Path pattern: {organization_id}/{conversation_id}/{message_id}/{filename}
-- Extraímos organization_id como o primeiro segmento.

create policy "messaging storage: members read"
  on storage.objects for select
  using (
    bucket_id = 'messaging'
    and public.is_org_member( (storage.foldername(name))[1]::uuid )
  );

create policy "messaging storage: members upload"
  on storage.objects for insert
  with check (
    bucket_id = 'messaging'
    and public.is_org_member( (storage.foldername(name))[1]::uuid )
  );

create policy "messaging storage: members delete"
  on storage.objects for delete
  using (
    bucket_id = 'messaging'
    and public.is_org_member( (storage.foldername(name))[1]::uuid )
  );
