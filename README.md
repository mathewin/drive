# DriveWin

Sistema de gestão para negócios de corridas com três painéis integrados e banco na nuvem (Supabase), pronto para operar de verdade.

## Painéis

| Painel | Arquivo | Acesso |
|--------|---------|--------|
| Central de acesso | `index.html` | Página inicial com links para todos os painéis |
| Admin | `painel-admin.html` | Gestão do negócio (vender acesso, parceiros, colaboradores, ranking, financeiro, auditoria) |
| Colaborador | `painel-colaborador.html` | Suporte aos motoristas e acompanhamento de tropas |
| Motorista | `painel-motorista.html` | Controle de ganhos por corrida, metas, XP e suporte |

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

## Subir para um domínio

O projeto é 100% estático (HTML + JS) e o banco é o Supabase na nuvem — não precisa de servidor próprio.

### 1. Antes de subir (uma única vez)

- Aplicar `supabase/addon_operacional.sql` no SQL Editor do Supabase (necessário para gestão de colaboradores e chamados).
- Garantir que a conta admin existe com `papel = 'admin'` na tabela `perfis` (o admin entra por e-mail/senha).
- Opcional: desativar **signups abertos** no Supabase (Auth → Providers → Email → "Allow new users to sign up") e liberar só os motoristas cadastrados pelo admin. Se desativado, motoristas não conseguem criar conta — para vender acesso, o admin cadastra a conta do motorista manualmente em Authentication → Users → Add user com o nome exato do assinante.

### 2. Hospedagem (escolha uma)

O site é estático, então qualquer host funciona:

- **Vercel / Netlify / Cloudflare Pages**: subir a pasta raiz deste repositório. O host cuida do HTTPS.
- **GitHub Pages**: publicar a branch `main` (a raiz já é o site).
- **Host com painel (cPanel/GoDaddy/Amazon S3)**: subir os arquivos na pasta pública (public_html / www).

### 3. Domínio

- No host, apontar o domínio (ex.: `drivewin.com.br`) para o site — cada host tem uma tela de "Custom domain / Domínio".
- Configurar no provedor de DNS os registros indicados pelo host (normalmente um `CNAME` para `www` e o domínio raiz apontando para o host, ou `A` para o IP).
- Aguardar a propagação (pode levar de minutos a algumas horas) — o HTTPS é emitido automaticamente pelo host.

### 4. Pronto

- O frontend já aponta para o Supabase via `supabase/config.js` (URL + chave publishable), então não precisa mudar nada no código para trocar de domínio.
- `index.html` é a página inicial (hub) — links para os três painéis.

### Testes

- `test_admin.js`, `test_colaborador.js`, `test_motorista.js` validam os fluxos dos painéis (rodar com `node test_*.js` na raiz).
