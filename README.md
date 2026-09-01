# DriveWin

Sistema de gestão para negócios de corridas com três painéis integrados e dados zerados, pronto para começar a operar de verdade.

## Painéis

| Painel | Arquivo | Acesso |
|--------|---------|--------|
| Central de acesso | `index.html` | Página inicial com links para todos os painéis |
| Admin | `painel-admin (5).html` | Gestão do negócio (vender acesso, parceiros, colaboradores, ranking, financeiro, auditoria) |
| Colaborador | `painel-colaborador.html` | Suporte aos motoristas e acompanhamento de tropas |
| Motorista | `painel-motorista-preview_mais_novo.html` | Controle de ganhos por corrida, metas, XP e suporte |

## Fluxo de uso

1. **Admin** — cadastre parceiros/tropas, venda acessos (cadastre assinantes) e adicione colaboradores da equipe.
2. **Motorista** — o motorista só entra se tiver um acesso ativo cadastrado pelo admin. Se o acesso for suspenso, é bloqueado.
3. **Colaborador** — a equipe entra pelo nome cadastrado no admin e acompanha chamados de suporte e tropas.

Para trocar de painel, use o link "Trocar painel" / "Central" disponível em cada um.

## Dados

Os painéis compartilham dados automaticamente via `localStorage`:

- `drivewin_admin_mock_v1` — tropas, parceiros, assinantes e colaboradores (Admin + Colaborador + Motorista)
- `drivewin_suporte_v1` — chamados de suporte (Motorista + Colaborador)
- `painelMotorista_*` — lançamentos, metas e configurações do motorista

Nenhum servidor é necessário: tudo funciona direto no navegador. Para limpar e recomeçar, basta limpar os dados do site no navegador.
