-- =============================================================
-- DriveWin — Ações do colaborador (rodar UMA vez no SQL Editor)
-- O colaborador confirma Pix e bloqueia/libera acesso, mas SOMENTE
-- nas tropas que o admin marcou pra ele (tropa_ids / todas_tropas).
-- O admin continua podendo tudo.
-- =============================================================

-- ---------- ASSINANTES ----------
-- Admin atualiza qualquer assinante; colaborador só os da própria tropa.
drop policy if exists "assinantes_update" on public.assinantes;
create policy "assinantes_update" on public.assinantes
  for update using (
    public.eh_admin()
    or (
      exists (
        select 1 from public.perfis p
        where p.id = auth.uid()
          and p.papel = 'colaborador'
          and public.assinantes.tropa_id is not null
          and (p.todas_tropas or p.tropa_ids @> array[public.assinantes.tropa_id]::uuid[])
      )
    )
  );

-- ---------- FILA DE PAGAMENTO ----------
-- Equipe lê/insere; confirmar (apagar) o aviso só o admin ou o
-- colaborador dono da tropa do assinante que avisou.
drop policy if exists "fila_all" on public.fila_pagamento;
drop policy if exists "fila_select" on public.fila_pagamento;
drop policy if exists "fila_insert" on public.fila_pagamento;
drop policy if exists "fila_delete" on public.fila_pagamento;

create policy "fila_select" on public.fila_pagamento
  for select using (public.eh_equipe());

create policy "fila_insert" on public.fila_pagamento
  for insert with check (public.eh_equipe());

create policy "fila_delete" on public.fila_pagamento
  for delete using (
    public.eh_admin()
    or (
      exists (
        select 1 from public.perfis p
        join public.assinantes a on a.nome = public.fila_pagamento.assinante
        where p.id = auth.uid()
          and p.papel = 'colaborador'
          and a.tropa_id is not null
          and (p.todas_tropas or p.tropa_ids @> array[a.tropa_id]::uuid[])
      )
    )
  );
