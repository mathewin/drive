-- =============================================================
-- DriveWin — Assinatura com código de parceiro (rodar UMA vez no SQL Editor)
-- Fluxo: preço cheio sem código / preço com desconto com código de parceiro,
-- comissão recorrente por renovação e auto-assinatura segura (pendente).
-- =============================================================

-- ---------- ASSINANTES ----------
-- valor pago pelo motorista (cheio ou com desconto) + código do parceiro usado
alter table public.assinantes
  add column if not exists valor numeric(12,2),
  add column if not exists cupom text;

-- Auto-assinatura: o motorista cria o PRÓPRIO assinante, mas só como
-- "pendente" e inativo (não consegue se liberar sozinho). O nome e o e-mail
-- precisam ser os dele.
drop policy if exists "assinantes_insert_motorista" on public.assinantes;
create policy "assinantes_insert_motorista" on public.assinantes
  for insert with check (
    status = 'pendente'
    and ativo = false
    and lower(nome) = lower((select nome from public.perfis where id = auth.uid()))
    and email = (select email from public.perfis where id = auth.uid())
  );

-- Motorista precisa ver a lista de parceiros (escolher o código) e os nomes
-- das tropas (saber em qual tropa está entrando). Nomes/cupons não são sigilo.
drop policy if exists "parceiros_select_motorista" on public.parceiros;
create policy "parceiros_select_motorista" on public.parceiros
  for select using (true);

drop policy if exists "tropas_select_motorista" on public.tropas;
create policy "tropas_select_motorista" on public.tropas
  for select using (true);
