-- Foundation de mensageria — canais configurados por org.

create table public.channels (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type            text not null check (type in ('whatsapp_cloud','telegram','instagram_dm','sms','mock')),
  name            text not null check (length(name) between 1 and 80),
  external_id     text,
  config          jsonb not null default '{}'::jsonb,
  status          text not null default 'pending' check (status in ('pending','connected','disconnected','error')),
  last_error      text,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  updated_at      timestamptz not null default now(),
  unique (organization_id, type, external_id)
);

create index channels_org_type_idx on public.channels(organization_id, type);

-- updated_at automático
create trigger channels_set_updated_at
  before update on public.channels
  for each row execute function public.set_updated_at();

-- Freeze organization_id em UPDATEs (evita member malicioso vazar pra outra org)
create or replace function public.freeze_messaging_org() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id é imutável';
  end if;
  return new;
end;
$$;

create trigger channels_freeze_org
  before update on public.channels
  for each row execute function public.freeze_messaging_org();

-- RLS — habilita (NÃO usar FORCE, ver regra absoluta #2)
alter table public.channels enable row level security;

create policy "channels: members read" on public.channels
  for select using (public.is_org_member(organization_id));

create policy "channels: admins insert" on public.channels
  for insert
  with check (
    public.has_org_role(organization_id, array['owner','admin']::public.org_role[])
    and auth.uid() = created_by
  );

create policy "channels: admins update" on public.channels
  for update
  using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

create policy "channels: admins delete" on public.channels
  for delete
  using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

comment on table public.channels is 'Canal de mensageria conectado a uma organização (Sub-projeto A foundation).';
comment on column public.channels.config is 'Tokens e configuração específica do provider. Leitura via getChannelConfig() apenas.';
