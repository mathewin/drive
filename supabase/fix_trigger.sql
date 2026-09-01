-- =============================================================
-- DriveWin — CORREÇÃO DO TRIGGER DE PERFIL (security definer)
-- Rodar UMA vez no SQL Editor. Necessário p/ permitir cadastro.
-- =============================================================

create or replace function public.criar_perfil()
returns trigger language plpgsql security definer as $$
begin
  insert into public.perfis (id, nome, papel, email, todas_tropas, tropa_ids)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1), 'Usuário'),
    coalesce(new.raw_user_meta_data->>'papel', 'motorista'),
    new.email,
    coalesce((new.raw_user_meta_data->>'todas_tropas') = 'true', false),
    coalesce(
      (select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'tropa_ids','[]'::jsonb)) x),
      '{}'::uuid[]
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
