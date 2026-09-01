# DriveWin

Sistema de gestão para negócios de corridas com três painéis integrados.

## Painéis

| Painel | Arquivo | Acesso |
|--------|---------|--------|
| Central de acesso | `index.html` | Página inicial com links para todos os painéis |
| Admin | `painel-admin (5).html` | Gestão do negócio (assinantes, tropas, ranking, financeiro, auditoria) |
| Colaborador | `painel-colaborador.html` | Suporte aos motoristas e acompanhamento de tropas |
| Motorista | `painel-motorista-preview_mais_novo.html` | Controle de ganhos por corrida, metas, XP e suporte |

## Como usar

1. Abra o `index.html` em um navegador.
2. Escolha o painel desejado.
3. Para trocar de painel, use o link "Trocar painel" / "Central" disponível em cada um.

## Dados

Os painéis compartilham dados automaticamente via `localStorage`:

- `drivewin_admin_mock_v1` — tropas e motoristas (Admin + Colaborador)
- `drivewin_suporte_v1` — chamados de suporte (Motorista + Colaborador)
- `painelMotorista_*` — lançamentos, metas e configurações do motorista

Nenhum servidor é necessário: tudo funciona direto no navegador.
