-- =============================================================
-- DriveWin — CAMP (campeonatos): persistência em nuvem
-- =============================================================
-- Guarda na nuvem (Supabase) os dados da aba Camp do motorista:
-- troféus, XP/bônus, duelos, histórico e estado — vinculados ao
-- usuário autenticado (auth.uid), como os lançamentos.
-- Assim nada se perde ao desinstalar/reinstalar o app ou trocar
-- de aparelho: ao entrar de novo com o mesmo e-mail, os resultados
-- da Camp voltam junto com os ganhos.
--
-- COMO USAR: rode UMA VEZ no SQL Editor do Supabase (Dashboard)
--   > seu-projeto > SQL Editor > New query > cole > Run
-- É idempotente: pode rodar de novo sem quebrar nada.
-- =============================================================

create table if not exists public.camp_estado (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.camp_estado enable row level security;

drop policy if exists "camp_estado_all" on public.camp_estado;
create policy "camp_estado_all" on public.camp_estado
  for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- garante que o app consegue ler/escrever a própria linha
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.camp_estado to authenticated;
