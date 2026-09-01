-- =============================================================
-- DriveWin — Addon operacional (rodar UMA vez no SQL Editor)
-- 1) Gestão de colaboradores pelo admin (promover/rebaixar perfil)
-- 2) Chamados com assunto + thread completa + motorista edita o próprio
-- =============================================================

-- ---------- 1) COLABORADORES ----------
-- Admin insere/atualiza perfis (para promover um motorista a colaborador)
drop policy if exists "perfis_update_admin" on public.perfis;
create policy "perfis_update_admin" on public.perfis
  for update using (public.eh_admin());

drop policy if exists "perfis_insert_admin" on public.perfis;
create policy "perfis_insert_admin" on public.perfis
  for insert with check (public.eh_admin());

-- ---------- 2) CHAMADOS ----------
-- Colunas extras p/ o app de suporte (thread de mensagens + assunto)
alter table public.chamados
  add column if not exists assunto text,
  add column if not exists thread jsonb not null default '[]';

-- Motorista vê/atualiza os próprios chamados na thread
drop policy if exists "chamados_update_motorista" on public.chamados;
create policy "chamados_update_motorista" on public.chamados
  for update using (nome = (select nome from public.perfis where id = auth.uid()));
