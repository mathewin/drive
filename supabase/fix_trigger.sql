-- =============================================================
-- DriveWin — CORREÇÃO DO TRIGGER DE PERFIL (security definer)
-- Rodar UMA vez no SQL Editor. Necessário p/ permitir cadastro.
-- =============================================================

create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, papel, email, todas_tropas, tropa_ids)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1), 'Usuário'),
    'motorista',
    new.email,
    false,
    '{}'::uuid[]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
