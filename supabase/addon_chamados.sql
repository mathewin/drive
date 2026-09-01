-- =============================================================
-- DriveWin — Addon: chamados com assunto + thread completa
-- Executar no SQL Editor do Supabase
-- =============================================================

-- Colunas extras p/ o app de suporte (thread de mensagens)
alter table public.chamados
  add column if not exists assunto text,
  add column if not exists thread jsonb not null default '[]';

-- Motorista vê/atualiza os próprios chamados na thread
drop policy if exists "chamados_update_motorista" on public.chamados;
create policy "chamados_update_motorista" on public.chamados
  for update using (nome = (select nome from public.perfis where id = auth.uid()));
