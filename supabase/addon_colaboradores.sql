-- =============================================================
-- DriveWin — Addon: gestão de colaboradores via admin
-- Permite o admin cadastrar/atualizar o papel e acesso de perfis
-- Executar no SQL Editor do Supabase
-- =============================================================

-- Admin lê todos os perfis (já existe via perfis_select, reforça)
-- Admin insere/atualiza perfis (para promover um motorista a colaborador)
drop policy if exists "perfis_update_admin" on public.perfis;
create policy "perfis_update_admin" on public.perfis
  for update using (public.eh_admin());

drop policy if exists "perfis_insert_admin" on public.perfis;
create policy "perfis_insert_admin" on public.perfis
  for insert with check (public.eh_admin());
