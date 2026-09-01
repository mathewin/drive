-- =============================================================
-- DriveWin — Telefone do motorista no cadastro (rodar UMA vez no SQL Editor)
-- Captura o celular obrigatório no cadastro e guarda no perfil e no assinante.
-- IMPORTANTE: mantém SECURITY DEFINER (senão o cadastro quebra — ver fix_trigger.sql).
-- =============================================================

-- Coluna de telefone no perfil e no assinante (só dígitos, ex: 62999999999)
alter table public.perfis add column if not exists telefone text;
alter table public.assinantes add column if not exists telefone text;

-- Atualiza o trigger de criação de perfil para gravar o telefone informado
-- no cadastro (raw_user_meta_data). Só vale para contas criadas daqui pra frente.
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer as $$
begin
  insert into public.perfis (id, nome, papel, email, telefone, todas_tropas, tropa_ids)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1), 'Usuário'),
    coalesce(new.raw_user_meta_data->>'papel', 'motorista'),
    new.email,
    new.raw_user_meta_data->>'telefone',
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_perfil();
