-- Permite ao criador ler a própria org (pra .insert().select() funcionar logo após criar)
create policy "creators read their orgs"
  on public.organizations for select
  using (created_by = auth.uid());

-- Permite ao criador inserir a primeira membership como owner
-- (precisa porque a policy "owners and admins create memberships" requer
--  membership existente, criando circularidade no bootstrap)
create policy "creator inserts initial owner membership"
  on public.memberships for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.organizations
      where id = organization_id and created_by = auth.uid()
    )
  );
