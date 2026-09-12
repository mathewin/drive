-- =============================================================
-- DriveWin — Correções de segurança (rodar UMA vez no SQL Editor)
-- Idempotente. Cobre: privilégio no cadastro, RLS, search_path,
-- fila Pix, config, update de assinante/chamado pelo motorista.
-- =============================================================

-- ---------- HELPERS (search_path fixo em security definer) ----------
create or replace function public.eh_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel in ('admin','colaborador')
  );
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'admin'
  );
$$;

-- ---------- CADASTRO: NUNCA copiar papel/permissões do cliente ----------
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, papel, email, telefone, todas_tropas, tropa_ids)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1), 'Usuário'),
    'motorista',
    new.email,
    new.raw_user_meta_data->>'telefone',
    false,
    '{}'::uuid[]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- ---------- PROMOÇÃO DE PARCEIRO: não rebaixa admin/colaborador ----------
create or replace function public.auto_promover_parceiro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.email is not null and new.email <> '') then
    update public.perfis
      set papel = 'parceiro'
      where id = new.id
        and papel = 'motorista'
        and exists (
          select 1 from public.parceiros par
          where lower(par.email) = lower(new.email)
        );
  end if;
  return new;
end;
$$;

-- ---------- CONFIG: só autenticado lê; só admin escreve ----------
drop policy if exists "config_select" on public.config;
create policy "config_select" on public.config
  for select using (auth.uid() is not null);

drop policy if exists "config_equipe" on public.config;
drop policy if exists "config_admin" on public.config;
create policy "config_admin" on public.config
  for all using (public.eh_admin()) with check (public.eh_admin());

-- ---------- PARCEIROS / TROPAS: leitura autenticada; escrita só admin ----------
drop policy if exists "parceiros_select_motorista" on public.parceiros;
create policy "parceiros_select_motorista" on public.parceiros
  for select using (auth.uid() is not null);

drop policy if exists "tropas_select_motorista" on public.tropas;
create policy "tropas_select_motorista" on public.tropas
  for select using (auth.uid() is not null);

drop policy if exists "tropas_insert" on public.tropas;
create policy "tropas_insert" on public.tropas
  for insert with check (public.eh_admin());
drop policy if exists "tropas_update" on public.tropas;
create policy "tropas_update" on public.tropas
  for update using (public.eh_admin());

drop policy if exists "parceiros_insert" on public.parceiros;
create policy "parceiros_insert" on public.parceiros
  for insert with check (public.eh_admin());
drop policy if exists "parceiros_update" on public.parceiros;
create policy "parceiros_update" on public.parceiros
  for update using (public.eh_admin() or public.eh_equipe());
drop policy if exists "parceiros_delete" on public.parceiros;
create policy "parceiros_delete" on public.parceiros
  for delete using (public.eh_admin());

-- Colaborador so altera comissao; nao troca cupom, tropa, nome ou e-mail
create or replace function public.proteger_parceiro_colaborador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.eh_admin() then
    return new;
  end if;
  if public.eh_equipe() then
    new.id := old.id;
    new.tropa_id := old.tropa_id;
    new.nome := old.nome;
    new.cupom := old.cupom;
    new.email := old.email;
    new.criado_em := old.criado_em;
    return new;
  end if;
  raise exception 'nao autorizado';
end;
$$;

drop trigger if exists trg_proteger_parceiro_colaborador on public.parceiros;
create trigger trg_proteger_parceiro_colaborador
  before update on public.parceiros
  for each row execute function public.proteger_parceiro_colaborador();

drop policy if exists "candidatos_all" on public.candidatos;
create policy "candidatos_all" on public.candidatos
  for all using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "alertas_all" on public.alertas_fraude;
create policy "alertas_all" on public.alertas_fraude
  for all using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "ranking_regiao_all" on public.ranking_regiao;
create policy "ranking_regiao_all" on public.ranking_regiao
  for all using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "premios_all" on public.premios;
create policy "premios_select" on public.premios
  for select using (public.eh_equipe());
create policy "premios_write" on public.premios
  for all using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "financeiro_all" on public.financeiro;
create policy "financeiro_select" on public.financeiro
  for select using (public.eh_equipe());
create policy "financeiro_write" on public.financeiro
  for all using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "auditoria_insert" on public.auditoria;
create policy "auditoria_insert" on public.auditoria
  for insert with check (public.eh_equipe());

-- ---------- FILA PIX: motorista só avisa o PRÓPRIO pagamento ----------
drop policy if exists "fila_insert_motorista" on public.fila_pagamento;
create policy "fila_insert_motorista" on public.fila_pagamento
  for insert with check (
    assinante = (select nome from public.perfis where id = auth.uid())
  );

-- ---------- ASSINANTES: leitura por e-mail; nome só se o registro não tem e-mail ----------
drop policy if exists "assinantes_select" on public.assinantes;
create policy "assinantes_select" on public.assinantes
  for select using (
    public.eh_equipe()
    or (
      email is not null and email <> ''
      and lower(email) = lower((select email from public.perfis where id = auth.uid()))
    )
    or (
      (email is null or email = '')
      and lower(nome) = lower((select nome from public.perfis where id = auth.uid()))
    )
  );

create unique index if not exists idx_assinantes_email_unique
  on public.assinantes (lower(email))
  where email is not null and email <> '';

-- Motorista pendente não pode se liberar nem alterar nome/e-mail/status
create or replace function public.proteger_assinante_motorista()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.eh_admin() or public.eh_equipe() then
    return new;
  end if;
  if old.status is distinct from 'pendente' or old.ativo is distinct from false then
    raise exception 'nao autorizado';
  end if;
  new.id := old.id;
  new.nome := old.nome;
  new.email := old.email;
  new.telefone := old.telefone;
  new.status := 'pendente';
  new.ativo := false;
  new.historico := old.historico;
  new.venc := old.venc;
  return new;
end;
$$;

drop trigger if exists trg_proteger_assinante_motorista on public.assinantes;
create trigger trg_proteger_assinante_motorista
  before update on public.assinantes
  for each row execute function public.proteger_assinante_motorista();

-- ---------- CHAMADOS: motorista não troca nome/tropa/assunto ----------
create or replace function public.proteger_chamado_motorista()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.eh_admin() or public.eh_equipe() then
    return new;
  end if;
  new.nome := old.nome;
  new.tropa := old.tropa;
  new.assunto := old.assunto;
  new.mensagem := old.mensagem;
  return new;
end;
$$;

drop trigger if exists trg_proteger_chamado_motorista on public.chamados;
create trigger trg_proteger_chamado_motorista
  before update on public.chamados
  for each row execute function public.proteger_chamado_motorista();

-- ---------- minha_tropa: search_path ----------
create or replace function public.minha_tropa()
returns text
language sql
stable
security definer
set search_path = public
as $$
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
