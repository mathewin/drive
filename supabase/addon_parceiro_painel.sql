-- =============================================================
-- DriveWin — Painel do parceiro (rodar UMA vez no SQL Editor)
-- Adiciona o e-mail de login ao parceiro, libera o papel 'parceiro'
-- e deixa o parceiro ver apenas os motoristas que usaram o cupom dele.
-- =============================================================

-- ---------- PARCEIROS ----------
-- E-mail que o parceiro usa pra entrar no painel (mesmo e-mail da conta dele).
alter table public.parceiros add column if not exists email text;

-- ---------- PERFIS ----------
-- Liberar o papel 'parceiro' para o login do painel do parceiro.
alter table public.perfis drop constraint if exists perfis_papel_check;
alter table public.perfis add constraint perfis_papel_check
  check (papel in ('admin','colaborador','motorista','parceiro'));

-- ---------- ASSINANTES ----------
-- O parceiro logado só consegue VER os assinantes que entraram com o cupom dele.
-- (não vê motoristas de outros parceiros nem os que entraram sem cupom)
drop policy if exists "assinantes_select_parceiro" on public.assinantes;
create policy "assinantes_select_parceiro" on public.assinantes
  for select using (
    exists (
      select 1
      from public.perfis p
      join public.parceiros par on lower(par.email) = lower(p.email)
      where p.id = auth.uid()
        and par.email is not null
        and par.email <> ''
        and lower(public.assinantes.cupom) = lower(par.cupom)
    )
  );

-- ---------- PROMOÇÃO AUTOMÁTICA ----------
-- Se o parceiro fizer o cadastro DEPOIS de ter sido criado no admin,
-- a conta dele é promovida a 'parceiro' sozinha (mesmo e-mail).
create or replace function public.auto_promover_parceiro()
returns trigger
language plpgsql
security definer
as $$
begin
  if (new.email is not null and new.email <> '') then
    update public.perfis
      set papel = 'parceiro'
      where id = new.id
        and papel <> 'parceiro'
        and exists (
          select 1 from public.parceiros par
          where lower(par.email) = lower(new.email)
        );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_perfis_auto_parceiro on public.perfis;
create trigger trg_perfis_auto_parceiro
  after insert on public.perfis
  for each row execute function public.auto_promover_parceiro();
