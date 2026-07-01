-- Fix encontrado em smoke test: array_length(arr, 1) retorna NULL pra array vazio,
-- não 0. Então `array_length >= 1` deixava array vazio passar (NULL >= 1 = NULL,
-- tratado como satisfeito pelo CHECK). cardinality() retorna 0 corretamente.

alter table public.tags drop constraint if exists tags_applies_to_not_empty;
alter table public.tags
  add constraint tags_applies_to_not_empty
    check (cardinality(applies_to) >= 1);
