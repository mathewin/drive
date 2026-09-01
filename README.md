# DriveWin

Sistema de gestão para negócios de corridas com três painéis integrados e banco na nuvem (Supabase), pronto para operar de verdade.

## Painéis

| Painel | Arquivo | Acesso |
|--------|---------|--------|
| Central de acesso | `index.html` | Página inicial com links para todos os painéis |
| Admin | `painel-admin.html` | Gestão do negócio (vender acesso, parceiros, colaboradores, ranking, financeiro, auditoria) |
| Colaborador | `painel-colaborador.html` | Suporte aos motoristas e acompanhamento de tropas |
| Motorista | `painel-motorista.html` | Controle de ganhos por corrida, metas, XP e suporte |

## Subdomínios (produção)

Cada painel vive em um repositório próprio, servido em um subdomínio do `drivewin.shop` via GitHub Pages:

| Painel | Subdomínio | Repositório |
|--------|-----------|-------------|
| Motorista | `motorista.drivewin.shop` | `mathewin/drive-motorista` |
| Admin | `admin.drivewin.shop` | `mathewin/drive-admin` |
| Colaborador + Parceiro | `colaborador.drivewin.shop` | `mathewin/drive-colaborador` |

> No subdomínio do colaborador, a tela de login pede pra **escolher entre Colaborador e Parceiro**. A mesma conta é validada conforme o papel: `colaborador`/`admin` entra como equipe; `parceiro` entra no painel do parceiro.

Os repositórios de painel são **cópias geradas** a partir deste repo canônico (cada uma com seu `index.html`, `supabase/config.js` e `CNAME`). Qualquer mudança aqui precisa ser re-sincronizada para os subdomínios.

## Fluxo de uso

1. **Admin** — cadastre parceiros/tropas, venda acessos (cadastre assinantes) e adicione colaboradores da equipe. Todos entram por **e-mail + senha**.
2. **Motorista** — só entra com um acesso ativo cadastrado pelo admin (o nome dele precisa bater com o assinante). Se o acesso for suspenso, é bloqueado.
3. **Colaborador** — a equipe entra por e-mail/senha e acompanha chamados de suporte e tropas. O admin promove a conta (que já deve estar cadastrada) na seção Colaboradores.
4. **Parceiro** — indicado pelo admin, entra pelo mesmo subdomínio escolhendo "Parceiro". Vê o próprio cupom, comissões (mês e total), quantos motoristas assinaram com o código dele e o progresso do campeonato da tropa (60/90/120).

**Acesso do colaborador**: o admin define se ele vê **todas as tropas** ou **apenas as selecionadas** (`tropa_ids`). O colaborador vê só o que é da tropa dele:
- **Suporte** — chamados dos motoristas das tropas liberadas.
- **Pagamentos** — fila de avisos de Pix das tropas dele, podendo **confirmar o pagamento e liberar o acesso** (vencimento +30 dias, comissão do parceiro creditada).
- **Tropas & Motoristas** — pode **bloquear/cancelar ou reativar** o acesso de motoristas das tropas dele.

Regras de segurança: bloqueado (`ativo=false` + `status='atrasado'`) corta o acesso na hora ("suspenso"); pendente **não** pode ser liberado por reativação (só confirmando o Pix); as políticas RLS impedem o colaborador de alterar assinantes de outras tropas.

Para trocar de painel, use o link "Trocar painel" / "Central" disponível em cada um.

## Painel do parceiro

Quando o admin cadastra um parceiro, ele informa o **e-mail** da conta do parceiro (o mesmo usado no cadastro no site). Se a conta já existir, ela é promovida a `parceiro` automaticamente. O parceiro entra em `colaborador.drivewin.shop`, escolhe **Parceiro** e vê:

- **Meu cupom** (com botão copiar) e o nome da tropa dele;
- **Comissão do mês e total** (R$ 1,49 recorrente por assinante ativo confirmado);
- **Motoristas** que assinaram com o código dele (nome, situação, vencimento e valor pago) — só os dele, graças à RLS por cupom;
- **Campeonato da tropa**: progresso até 60 (diário), 90 (semanal) e 120 (mensal), com os prêmios definidos pela administração.

## Pagamento por Pix (sem gateway)

Todo pagamento é manual via Pix — o sistema organiza o fluxo de **receber antes de liberar**:

1. **Admin define a chave Pix, os preços e as comissões** na seção "Pix e mensalidade" (tabela `config`): preço cheio (sem código), preço com parceiro, comissão do parceiro, WhatsApp do suporte e prêmios dos campeonatos.
2. **Assinatura direta (sem código)**: o motorista entra no app, assina pelo **preço cheio**, paga via Pix e o admin confirma.
3. **Com código de parceiro**: o motorista escolhe um parceiro na lista do app (ou digita o código do Instagram), o preço cai para o **preço com parceiro** e ele entra automaticamente na **Tropa do [parceiro]**.
4. Em ambos os casos o acesso nasce **pendente/bloqueado**. O motorista vê a chave Pix e o valor, paga e clica em **"Já fiz o Pix"** — o aviso entra na **Fila de avisos de pagamento** do Admin.
5. O admin (ou colaborador da tropa) confere o recebido no banco e **confirma** → acesso liberado + vencimento +30 dias.
6. **Comissão recorrente**: cada renovação confirmada de um assinante com cupom credita a comissão do parceiro (todo mês, não só na 1ª venda).
7. **Renovação**: acesso com `venc` vencido volta para a tela de pagamento; o app avisa **1 dia antes** do vencimento. Alternativa de suporte pelo **WhatsApp** configurado.
8. **Campeonatos por tropa**: 60 assinantes ativos = campeonato diário, 90 = + semanal, 120 = + mensal (status visível no Admin e no Colaborador, com prêmios configuráveis).

SQL necessário (uma vez): `supabase/addon_pix.sql` (config + políticas de aviso de pagamento) e `supabase/addon_parceiros.sql` (colunas `valor`/`cupom`, auto-assinatura segura e leitura de parceiros/tropas pelo motorista).

## Banco de dados

Os dados ficam no Supabase (PostgreSQL). A configuração de acesso está em `supabase/config.js` (URL pública + chave publishable do frontend).

- `supabase/schema.sql` — schema completo (tabelas, RLS, triggers) — já aplicado.
- `supabase/addon_migracao.sql` — coluna `dados` em lançamentos, RPC `minha_tropa()`, trigger atualizado — já aplicado.
- `supabase/fix_trigger.sql` — correção do trigger `criar_perfil` (security definer) — já aplicado.
- `supabase/addon_operacional.sql` — **aplicado**: políticas de colaboradores e colunas de chamados.
- `supabase/addon_acesso_email.sql` — **aplicado**: coluna `email` em assinantes e acesso validado por e-mail.
- `supabase/addon_pix.sql` — **aplicado**: tabela `config` (chave Pix + mensalidade) e políticas do fluxo de pagamento.
- `supabase/addon_parceiros.sql` — **aplicado**: colunas `valor`/`cupom` em assinantes, auto-assinatura segura e leitura de parceiros/tropas pelo motorista.
- `supabase/addon_colab_acoes.sql` — **aplicar uma vez no SQL Editor**: restringe a ações do colaborador às tropas dele (confirmar Pix, bloquear/liberar acesso).

Segurança por RLS (Row Level Security): cada motorista só vê os próprios lançamentos/metas/chamados; a equipe (admin/colaborador) vê tudo.

## Subir para um domínio

O projeto é 100% estático (HTML + JS) e o banco é o Supabase na nuvem — não precisa de servidor próprio.

### 1. Antes de subir (uma única vez)

- Aplicar `supabase/addon_pix.sql`, `supabase/addon_parceiros.sql` e `supabase/addon_colab_acoes.sql` no SQL Editor do Supabase (fluxo de pagamento Pix com código de parceiro e ações do colaborador por tropa).
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
