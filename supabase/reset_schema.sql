-- =============================================================
-- DriveWin — RESET COMPLETO + SCHEMA
-- Apaga tabelas antigas e cria o sistema zerado do zero.
-- Rodar no SQL Editor do Supabase.
-- =============================================================

-- ---------- 1) APAGAR TABELAS ANTIGAS DO SISTEMA (reset) ----------
drop table if exists public.lancamentos cascade;
drop table if exists public.perfis cascade;
drop table if exists public.tropas cascade;
drop table if exists public.parceiros cascade;
drop table if exists public.candidatos cascade;
drop table if exists public.assinantes cascade;
drop table if exists public.fila_pagamento cascade;
drop table if exists public.alertas_fraude cascade;
drop table if exists public.ranking_regiao cascade;
drop table if exists public.premios cascade;
drop table if exists public.chamados cascade;
drop table if exists public.metas cascade;
drop table if exists public.financeiro cascade;
drop table if exists public.auditoria cascade;

-- ---------- 2) USUÁRIOS / PERFIS ----------
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null default 'motorista' check (papel in ('admin','colaborador','motorista')),
  email text,
  tropa_id uuid,
  todas_tropas boolean not null default false,
  tropa_ids uuid[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------- TROPAS ----------
create table public.tropas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------- PARCEIROS ----------
create table public.parceiros (
  id uuid primary key default gen_random_uuid(),
  tropa_id uuid references public.tropas(id) on delete cascade,
  nome text not null,
  cupom text unique not null,
  comissao_mes numeric(12,2) not null default 0,
  comissao_total numeric(12,2) not null default 0,
  criado_em timestamptz not null default now()
);

-- ---------- CANDIDATOS ----------
create table public.candidatos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  perfil text,
  criado_em timestamptz not null default now()
);

-- ---------- ASSINANTES (acessos vendidos) ----------
create table public.assinantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tropa_id uuid references public.tropas(id) on delete set null,
  status text not null default 'pago' check (status in ('pago','pendente','atrasado')),
  ativo boolean not null default true,
  venc date,
  historico jsonb not null default '[]',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------- FILA DE PAGAMENTO ----------
create table public.fila_pagamento (
  id uuid primary key default gen_random_uuid(),
  assinante text not null,
  valor numeric(12,2) not null default 0,
  motivo text,
  criado_em timestamptz not null default now()
);

-- ---------- ALERTAS DE FRAUDE ----------
create table public.alertas_fraude (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  criado_em timestamptz not null default now()
);

-- ---------- RANKING REGIÃO ----------
create table public.ranking_regiao (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tropa text,
  valor numeric(12,2) not null default 0
);

-- ---------- PRÊMIOS ----------
create table public.premios (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  escopo text,
  ganhador text,
  valor numeric(12,2) not null default 0,
  antifraude text not null default 'pendente',
  status text not null default 'liberado'
);

-- ---------- CHAMADOS DE SUPORTE ----------
create table public.chamados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tropa text,
  mensagem text not null,
  status text not null default 'aberto' check (status in ('aberto','respondido','fechado')),
  resposta text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------- LANÇAMENTOS DOS MOTORISTAS ----------
create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete cascade not null,
  data date not null,
  corridas integer not null default 0,
  km numeric(10,2) not null default 0,
  horas numeric(10,2) not null default 0,
  bruto numeric(12,2) not null default 0,
  gasolina numeric(12,2) not null default 0,
  apps numeric(12,2) not null default 0,
  rede numeric(12,2) not null default 0,
  alimentacao numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  nota text,
  criado_em timestamptz not null default now(),
  unique(usuario_id, data)
);

-- ---------- METAS DOS MOTORISTAS ----------
create table public.metas (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  diaria numeric(12,2) not null default 0,
  semanal numeric(12,2) not null default 0,
  mensal numeric(12,2) not null default 0,
  horas numeric(12,2) not null default 0,
  km numeric(12,2) not null default 0,
  dias integer not null default 0,
  atualizado_em timestamptz not null default now()
);

-- ---------- FINANCEIRO (resumo) ----------
create table public.financeiro (
  id integer primary key default 1 check (id = 1),
  receita_bruta numeric(12,2) not null default 0,
  comissoes_pagas numeric(12,2) not null default 0,
  premiacao_paga numeric(12,2) not null default 0,
  data_lancamento date not null default current_date,
  atualizado_em timestamptz not null default now()
);

-- ---------- AUDITORIA ----------
create table public.auditoria (
  id bigint generated always as identity primary key,
  usuario text not null,
  acao text not null,
  detalhe text,
  em timestamptz not null default now()
);

-- ---------- ÍNDICES ----------
create index if not exists idx_assinantes_tropa on public.assinantes(tropa_id);
create index if not exists idx_lancamentos_usuario_data on public.lancamentos(usuario_id, data desc);
create index if not exists idx_chamados_status on public.chamados(status);
create index if not exists idx_perfis_papel on public.perfis(papel);

-- =============================================================
-- ROW LEVEL SECURITY (SEGURANÇA)
-- =============================================================
alter table public.perfis enable row level security;
alter table public.tropas enable row level security;
alter table public.parceiros enable row level security;
alter table public.candidatos enable row level security;
alter table public.assinantes enable row level security;
alter table public.fila_pagamento enable row level security;
alter table public.alertas_fraude enable row level security;
alter table public.ranking_regiao enable row level security;
alter table public.premios enable row level security;
alter table public.chamados enable row level security;
alter table public.lancamentos enable row level security;
alter table public.metas enable row level security;
alter table public.financeiro enable row level security;
alter table public.auditoria enable row level security;

-- Helper: usuário logado é admin/colaborador?
create or replace function public.eh_equipe()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel in ('admin','colaborador')
  );
$$;

-- Helper: usuário logado é admin?
create or replace function public.eh_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'admin'
  );
$$;

-- PERFIS: cada um só vê o próprio perfil; admin vê todos
drop policy if exists "perfis_select" on public.perfis;
create policy "perfis_select" on public.perfis
  for select using (id = auth.uid() or public.eh_admin());

-- TROPAS: equipe lê/escreve
drop policy if exists "tropas_select" on public.tropas;
create policy "tropas_select" on public.tropas
  for select using (public.eh_equipe());
drop policy if exists "tropas_insert" on public.tropas;
create policy "tropas_insert" on public.tropas
  for insert with check (public.eh_equipe());
drop policy if exists "tropas_update" on public.tropas;
create policy "tropas_update" on public.tropas
  for update using (public.eh_equipe());

-- PARCEIROS: equipe
drop policy if exists "parceiros_select" on public.parceiros;
create policy "parceiros_select" on public.parceiros
  for select using (public.eh_equipe());
drop policy if exists "parceiros_insert" on public.parceiros;
create policy "parceiros_insert" on public.parceiros
  for insert with check (public.eh_equipe());
drop policy if exists "parceiros_update" on public.parceiros;
create policy "parceiros_update" on public.parceiros
  for update using (public.eh_equipe());
drop policy if exists "parceiros_delete" on public.parceiros;
create policy "parceiros_delete" on public.parceiros
  for delete using (public.eh_equipe());

-- CANDIDATOS: equipe
drop policy if exists "candidatos_all" on public.candidatos;
create policy "candidatos_all" on public.candidatos
  for all using (public.eh_equipe()) with check (public.eh_equipe());

-- ASSINANTES: equipe lê/escreve; motorista vê o próprio nome (checagem de acesso)
drop policy if exists "assinantes_select" on public.assinantes;
create policy "assinantes_select" on public.assinantes
  for select using (public.eh_equipe() or (select lower(nome) = lower((select nome from public.perfis where id = auth.uid()))));
drop policy if exists "assinantes_insert" on public.assinantes;
create policy "assinantes_insert" on public.assinantes
  for insert with check (public.eh_equipe());
drop policy if exists "assinantes_update" on public.assinantes;
create policy "assinantes_update" on public.assinantes
  for update using (public.eh_equipe());

-- FILA DE PAGAMENTO: equipe
drop policy if exists "fila_all" on public.fila_pagamento;
create policy "fila_all" on public.fila_pagamento
  for all using (public.eh_equipe()) with check (public.eh_equipe());

-- ALERTAS: equipe
drop policy if exists "alertas_all" on public.alertas_fraude;
create policy "alertas_all" on public.alertas_fraude
  for all using (public.eh_equipe()) with check (public.eh_equipe());

-- RANKING REGIÃO: equipe
drop policy if exists "ranking_regiao_all" on public.ranking_regiao;
create policy "ranking_regiao_all" on public.ranking_regiao
  for all using (public.eh_equipe()) with check (public.eh_equipe());

-- PRÊMIOS: equipe
drop policy if exists "premios_all" on public.premios;
create policy "premios_all" on public.premios
  for all using (public.eh_equipe()) with check (public.eh_equipe());

-- CHAMADOS: motorista cria e vê os próprios; equipe vê/atualiza todos
drop policy if exists "chamados_select" on public.chamados;
create policy "chamados_select" on public.chamados
  for select using (public.eh_equipe() or nome = (select nome from public.perfis where id = auth.uid()));
drop policy if exists "chamados_insert" on public.chamados;
create policy "chamados_insert" on public.chamados
  for insert with check (nome = (select nome from public.perfis where id = auth.uid()));
drop policy if exists "chamados_update" on public.chamados;
create policy "chamados_update" on public.chamados
  for update using (public.eh_equipe());

-- LANÇAMENTOS: cada motorista só os próprios
drop policy if exists "lancamentos_all" on public.lancamentos;
create policy "lancamentos_all" on public.lancamentos
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- METAS: cada motorista só as próprias
drop policy if exists "metas_all" on public.metas;
create policy "metas_all" on public.metas
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- FINANCEIRO: equipe
drop policy if exists "financeiro_all" on public.financeiro;
create policy "financeiro_all" on public.financeiro
  for all using (public.eh_equipe()) with check (public.eh_equipe());

-- AUDITORIA: equipe lê/escreve
drop policy if exists "auditoria_select" on public.auditoria;
create policy "auditoria_select" on public.auditoria
  for select using (public.eh_equipe());
drop policy if exists "auditoria_insert" on public.auditoria;
create policy "auditoria_insert" on public.auditoria
  for insert with check (public.eh_equipe());

-- =============================================================
-- FUNÇÕES / TRIGGERS
-- =============================================================
create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_perfis_upd on public.perfis;
create trigger trg_perfis_upd before update on public.perfis
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_assinantes_upd on public.assinantes;
create trigger trg_assinantes_upd before update on public.assinantes
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_metas_upd on public.metas;
create trigger trg_metas_upd before update on public.metas
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_financeiro_upd on public.financeiro;
create trigger trg_financeiro_upd before update on public.financeiro
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_chamados_upd on public.chamados;
create trigger trg_chamados_upd before update on public.chamados
  for each row execute function public.set_atualizado_em();

-- Perfil criado automaticamente no primeiro login
create or replace function public.criar_perfil()
returns trigger language plpgsql as $$
begin
  insert into public.perfis (id, nome, papel, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1), 'Usuário'),
    coalesce(new.raw_user_meta_data->>'papel', 'motorista'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Seed: financeiro inicial zerado
insert into public.financeiro (id, receita_bruta, comissoes_pagas, premiacao_paga)
values (1, 0, 0, 0)
on conflict (id) do nothing;

-- =============================================================
-- IMPORTANTE — Primeiro admin:
-- 1) Crie um usuário no painel "Authentication → Users → Add user" (ex.: admin@drivewin.com)
-- 2) Depois rode o UPDATE abaixo com o ID desse usuário:
--    update public.perfis set papel = 'admin' where id = '<UUID_DO_USUARIO>';
-- =============================================================
