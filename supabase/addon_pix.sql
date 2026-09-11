-- =============================================================
-- DriveWin — Fluxo de pagamento via Pix (rodar UMA vez no SQL Editor)
-- Recebe o pagamento ANTES de liberar o acesso:
-- 1) Admin configura a chave Pix + mensalidade (tabela config)
-- 2) Motorista pendente vê a chave no app e avisa quando pagou
-- 3) Aviso entra na fila_pagamento; admin confirma e libera
-- =============================================================

-- ---------- CONFIG (chave pix + valor) ----------
create table if not exists public.config (
  chave text primary key,
  valor text,
  atualizado_em timestamptz not null default now()
);
alter table public.config enable row level security;

-- Só autenticado lê (motorista precisa ver a chave p/ pagar); só admin escreve
drop policy if exists "config_select" on public.config;
create policy "config_select" on public.config
  for select using (auth.uid() is not null);

drop policy if exists "config_equipe" on public.config;
drop policy if exists "config_admin" on public.config;
create policy "config_admin" on public.config
  for all using (public.eh_admin()) with check (public.eh_admin());

-- ---------- FILA DE PAGAMENTO ----------
-- Motorista pode avisar o próprio pagamento (insere na fila) e ver o aviso
drop policy if exists "fila_insert_motorista" on public.fila_pagamento;
create policy "fila_insert_motorista" on public.fila_pagamento
  for insert with check (
    assinante = (select nome from public.perfis where id = auth.uid())
  );

drop policy if exists "fila_select_motorista" on public.fila_pagamento;
create policy "fila_select_motorista" on public.fila_pagamento
  for select using (assinante = (select nome from public.perfis where id = auth.uid()));
