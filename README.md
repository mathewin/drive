# DriveWin

Sistema de gestão para negócios de corridas com três painéis integrados e banco na nuvem (Supabase), pronto para operar de verdade.

## Painéis

| Painel | Arquivo | Acesso |
|--------|---------|--------|
| Central de acesso | `index.html` | Página inicial com links para todos os painéis |
| Admin | `painel-admin (5).html` | Gestão do negócio (vender acesso, parceiros, colaboradores, ranking, financeiro, auditoria) |
| Colaborador | `painel-colaborador.html` | Suporte aos motoristas e acompanhamento de tropas |
| Motorista | `painel-motorista-preview_mais_novo.html` | Controle de ganhos por corrida, metas, XP e suporte |

## Fluxo de uso

1. **Admin** — cadastre parceiros/tropas, venda acessos (cadastre assinantes) e adicione colaboradores da equipe. Todos entram por **e-mail + senha**.
2. **Motorista** — só entra com um acesso ativo cadastrado pelo admin (o nome dele precisa bater com o assinante). Se o acesso for suspenso, é bloqueado.
3. **Colaborador** — a equipe entra por e-mail/senha e acompanha chamados de suporte e tropas. O admin promove a conta (que já deve estar cadastrada) na seção Colaboradores.

Para trocar de painel, use o link "Trocar painel" / "Central" disponível em cada um.

## Banco de dados

Os dados ficam no Supabase (PostgreSQL). A configuração de acesso está em `supabase/config.js` (URL pública + chave publishable do frontend).

- `supabase/schema.sql` — schema completo (tabelas, RLS, triggers) — já aplicado.
- `supabase/addon_migracao.sql` — coluna `dados` em lançamentos, RPC `minha_tropa()`, trigger atualizado — já aplicado.
- `supabase/fix_trigger.sql` — correção do trigger `criar_perfil` (security definer) — já aplicado.
- `supabase/addon_operacional.sql` — **aplicar uma vez no SQL Editor**: políticas de colaboradores e colunas de chamados.

Segurança por RLS (Row Level Security): cada motorista só vê os próprios lançamentos/metas/chamados; a equipe (admin/colaborador) vê tudo.
