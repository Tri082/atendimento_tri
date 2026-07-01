-- Sub-projeto B: templates WhatsApp sincronizados read-only da Meta.

create table public.whatsapp_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id      uuid not null references public.channels(id) on delete cascade,
  meta_id         text not null,
  name            text not null check (length(name) between 1 and 200),
  language        text not null check (length(language) between 2 and 10),
  category        text not null check (category in ('MARKETING','UTILITY','AUTHENTICATION')),
  status          text not null check (status in ('APPROVED','PENDING','REJECTED','PAUSED','DISABLED')),
  components      jsonb not null default '[]'::jsonb,
  param_count     int not null default 0 check (param_count >= 0),
  synced_at       timestamptz not null default now(),
  unique (channel_id, name, language)
);

create index whatsapp_templates_channel_status_idx
  on public.whatsapp_templates(channel_id, status);

create trigger whatsapp_templates_freeze_org
  before update on public.whatsapp_templates
  for each row execute function public.freeze_messaging_org();

alter table public.whatsapp_templates enable row level security;

create policy "wpp_templates: members read" on public.whatsapp_templates
  for select using (public.is_org_member(organization_id));

create policy "wpp_templates: admins write" on public.whatsapp_templates
  for all
  using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

comment on table public.whatsapp_templates is 'Templates WhatsApp sincronizados da Meta (read-only do nosso lado).';
