create table public.deal_contacts (
  deal_id uuid not null references public.deals(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deal_id, contact_id)
);

create index deal_contacts_contact_id_idx on public.deal_contacts(contact_id);

alter table public.deal_contacts enable row level security;

create policy "members read deal_contacts"
  on public.deal_contacts for select
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_contacts.deal_id
        and public.is_org_member(d.organization_id)
    )
  );

create policy "members insert deal_contacts"
  on public.deal_contacts for insert
  with check (
    exists (
      select 1 from public.deals d
      where d.id = deal_contacts.deal_id
        and public.is_org_member(d.organization_id)
    )
  );

create policy "members delete deal_contacts"
  on public.deal_contacts for delete
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_contacts.deal_id
        and public.is_org_member(d.organization_id)
    )
  );
