-- =============================================================
-- DriveWin — Acesso por e-mail (rodar UMA vez no SQL Editor)
-- Vincula cada assinante (acesso vendido) ao e-mail do motorista,
-- impedindo que outra pessoa entre usando só o nome.
-- =============================================================

-- Coluna de e-mail nos assinantes
alter table public.assinantes
  add column if not exists email text;

-- Motorista também vê o próprio assinante pelo e-mail
-- (mantém o acesso por nome para registros antigos sem e-mail)
drop policy if exists "assinantes_select" on public.assinantes;
create policy "assinantes_select" on public.assinantes
  for select using (
    public.eh_equipe()
    or lower(coalesce(email,'')) = lower((select email from public.perfis where id = auth.uid()))
    or lower(nome) = lower((select nome from public.perfis where id = auth.uid()))
  );
