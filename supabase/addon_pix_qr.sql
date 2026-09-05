-- =============================================================
-- DriveWin — Cupom DRIVE + update do próprio pendente (rodar UMA vez no SQL Editor)
--
-- 1) Garante a tropa do Admin e o parceiro com cupom "DRIVE"
--    (quem usa DRIVE paga com desconto e entra na tropa do Admin).
-- 2) Deixa o motorista pendente aplicar/editar o PRÓPRIO cupom
--    (usar DRIVE na tela de pagamento), sem conseguir se liberar sozinho.
--
-- As imagens de QR (preço cheio e preço com cupom) e os textos
-- "Pix copia e cola" são salvos pelo Painel Admin na tabela config
-- (chaves: qr_cheio, qr_cupom, pix_copia_cheio, pix_copia_cupom) — sem DDL.
-- =============================================================

-- ---------- 1) Tropa + parceiro do Admin (cupom DRIVE) ----------
do $$
declare
  v_tropa_id uuid;
begin
  -- garante a tropa do Admin
  select id into v_tropa_id from public.tropas
    where upper(nome) = upper('Tropa Admin DriveWin')
    limit 1;
  if v_tropa_id is null then
    insert into public.tropas (nome, ativa)
    values ('Tropa Admin DriveWin', true)
    returning id into v_tropa_id;
  end if;

  -- garante o parceiro DRIVE apontando pra tropa do Admin
  if not exists (select 1 from public.parceiros where upper(cupom) = 'DRIVE') then
    insert into public.parceiros (tropa_id, nome, cupom, comissao_mes, comissao_total)
    values (v_tropa_id, 'Admin DriveWin', 'DRIVE', 0, 0);
  end if;
end $$;

-- ---------- 2) Motorista pode aplicar o próprio cupom enquanto pendente ----------
-- Só a própria assinatura, ainda pendente e inativa (não libera acesso sozinho).
drop policy if exists "assinantes_update_motorista_pendente" on public.assinantes;
create policy "assinantes_update_motorista_pendente" on public.assinantes
  for update using (
    status = 'pendente'
    and ativo = false
    and lower(coalesce(email, '')) = lower((select email from public.perfis where id = auth.uid()))
  )
  with check (
    status = 'pendente'
    and ativo = false
    and lower(coalesce(email, '')) = lower((select email from public.perfis where id = auth.uid()))
  );
