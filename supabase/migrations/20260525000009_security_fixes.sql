-- Fix 1: set_updated_at sem search_path mutable
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Fix 2: handle_new_user só deve rodar como trigger, não via RPC público
revoke execute on function public.handle_new_user() from anon, authenticated, public;
