-- Organizations
create policy "members read their orgs"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "any authenticated user creates an org"
  on public.organizations for insert
  with check (auth.uid() = created_by);

create policy "owners and admins update org"
  on public.organizations for update
  using (public.has_org_role(id, array['owner', 'admin']::public.org_role[]))
  with check (public.has_org_role(id, array['owner', 'admin']::public.org_role[]));

create policy "owners delete org"
  on public.organizations for delete
  using (public.has_org_role(id, array['owner']::public.org_role[]));

-- Memberships
create policy "members read memberships of their orgs"
  on public.memberships for select
  using (public.is_org_member(organization_id));

create policy "owners and admins create memberships"
  on public.memberships for insert
  with check (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]));

create policy "owners and admins update memberships"
  on public.memberships for update
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]));

create policy "owners and admins delete memberships"
  on public.memberships for delete
  using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[])
    and role <> 'owner'
  );

-- Invitations
create policy "members read invitations of their orgs"
  on public.invitations for select
  using (public.is_org_member(organization_id));

create policy "owners and admins create invitations"
  on public.invitations for insert
  with check (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]));

create policy "owners and admins delete invitations"
  on public.invitations for delete
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]));
