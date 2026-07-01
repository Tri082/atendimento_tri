-- Optional link: a task may belong to a contact. Deleting the contact keeps the
-- task (set null) — historical record of work done is preserved.
alter table public.tasks
  add column contact_id uuid references public.contacts(id) on delete set null;

create index tasks_contact_id_idx on public.tasks(contact_id);
