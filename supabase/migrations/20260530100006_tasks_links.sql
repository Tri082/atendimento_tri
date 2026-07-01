-- Recreate contact_id (was dropped in 100001) and add company_id, deal_id.
alter table public.tasks
  add column contact_id uuid references public.contacts(id) on delete set null,
  add column company_id uuid references public.companies(id) on delete set null,
  add column deal_id uuid references public.deals(id) on delete set null;

create index tasks_contact_id_idx on public.tasks(contact_id);
create index tasks_company_id_idx on public.tasks(company_id);
create index tasks_deal_id_idx on public.tasks(deal_id);
