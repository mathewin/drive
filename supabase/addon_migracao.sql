-- =============================================================
-- DriveWin — ADDON PARA A MIGRAÇÃO SUPABASE
-- Rodar UMA vez no SQL Editor, depois do reset_schema.sql
-- =============================================================

-- 1) Coluna para guardar o lançamento completo do motorista (campos do formulário)
alter table public.lancamentos add column if not exists dados jsonb not null default '{}';

-- 2) Função p/ o motorista descobrir o nome da própria tropa (sem expor a tabela de tropas)
create or replace function public.minha_tropa()
returns text language sql stable security definer set search_path = public as $$
  select t.nome
  from public.assinantes a
  join public.tropas t on t.id = a.tropa_id
  where lower(coalesce(a.email, '')) = lower((select email from public.perfis where id = auth.uid()))
     or (
       (a.email is null or a.email = '')
       and lower(a.nome) = lower((select nome from public.perfis where id = auth.uid()))
     )
  limit 1;
$$;

-- 3) Trigger de perfil atualizado: também copia todas_tropas e tropa_ids do metadata do usuário
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

-- 4) Admin pode editar e remover perfis (para gerenciar colaboradores)
drop policy if exists "perfis_admin_update" on public.perfis;
create policy "perfis_admin_update" on public.perfis
  for update using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "perfis_admin_delete" on public.perfis;
create policy "perfis_admin_delete" on public.perfis
  for delete using (public.eh_admin());
