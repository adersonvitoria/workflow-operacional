# Workflow Operacional — Segurança Eletrônica & Monitoramento

Esteira de produção (Kanban) que substitui as dezenas de planilhas desconexas
por um fluxo único integrando **Comercial, Compras, Almoxarifado, Monitoramento,
Técnica (Supervisores) e Faturamento (Medições)**.

Stack: **Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · @dnd-kit**.

---

## Como rodar

```powershell
cd workflow-operacional
npm install
npm run dev          # http://localhost:3000
```

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│  UI (Next.js App Router · RSC + Client Components)             │
│   Sidebar · Topbar · KanbanBoard · SlideOver                  │
├──────────────────────────────────────────────────────────────┤
│  Camada de aplicação (lib/)                                    │
│   flows.ts  → definição declarativa das colunas por fluxo     │
│   api/      → TanStack Query (mutations otimistas)            │  ← a adicionar
├──────────────────────────────────────────────────────────────┤
│  Domínio (types/card.ts)                                       │
│   Card único atende Implantação + Manutenção (discriminador)  │
├──────────────────────────────────────────────────────────────┤
│  Backend (sugerido)  Node + Prisma + PostgreSQL                │  ← a adicionar
│   /api/cards  /api/cards/:id/mover  /api/webhooks/sigma       │
├──────────────────────────────────────────────────────────────┤
│  Integração futura: Sigma Cloud (API)                          │
│   criação de conta · sync de status · CHIPs · CFTV            │
└──────────────────────────────────────────────────────────────┘
```

### Por que UM modelo de Card para os dois fluxos

As planilhas mostram que Implantação e Manutenção compartilham ~80% dos campos
(cliente, CR, valores, materiais, responsável, histórico). A diferença está
apenas na **sequência de etapas**. Por isso usamos um `Card` único com o
discriminador `fluxo` + enum de `etapa`, e o board lê as colunas de `flows.ts`.
Adicionar uma etapa é editar um array — a UI não muda.

---

## Estrutura de pastas (recomendada)

```
workflow-operacional/
├─ src/
│  ├─ app/                          # App Router
│  │  ├─ layout.tsx                 # html/body + fontes
│  │  ├─ globals.css                # Tailwind + Inter
│  │  ├─ page.tsx                   # shell de demonstração (board + slide-over)
│  │  └─ (dashboard)/               # rotas reais (a expandir)
│  │     ├─ dashboard/page.tsx
│  │     ├─ implantacoes/page.tsx
│  │     ├─ manutencoes/page.tsx
│  │     ├─ estoque/page.tsx
│  │     └─ configuracoes/page.tsx
│  ├─ components/
│  │  ├─ kanban/
│  │  │  ├─ KanbanBoard.tsx         # DndContext + distribuição por etapa
│  │  │  ├─ KanbanColumn.tsx        # coluna droppable + contador/soma
│  │  │  ├─ KanbanCard.tsx          # card resumo (sortable)
│  │  │  └─ CardSlideOver.tsx       # painel lateral de detalhes
│  │  ├─ layout/
│  │  │  ├─ Sidebar.tsx             # menu retrátil
│  │  │  └─ Topbar.tsx
│  │  └─ ui/                        # Badge, Button, Tag... (design system)
│  ├─ lib/
│  │  ├─ flows.ts                   # colunas + mapas de status/setor
│  │  ├─ mock-data.ts               # dados de exemplo (trocar pela API)
│  │  └─ api/                       # client + hooks TanStack Query
│  └─ types/
│     └─ card.ts                    # modelos de domínio
├─ tailwind.config.ts               # paleta corporativa
├─ package.json
└─ tsconfig.json                    # alias @/* → src/*
```

---

## Modelo de dados — vocabulário das planilhas

Os campos foram extraídos das planilhas reais para evitar retrabalho na migração:

| Conceito        | Origem na planilha            | Campo no modelo            |
| --------------- | ----------------------------- | -------------------------- |
| Centro Result.  | coluna `CR`                   | `Card.cr`                  |
| Centro de Custo | coluna `CC`                   | `Card.cc`                  |
| Conta Sigma     | coluna `CONTA` / `SIGMA`      | `Card.sigma.contaSigma`    |
| Chamado / OS    | coluna `CHAMADO` / `OS`       | `Card.chamado`             |
| Venda/Locação   | coluna `SETOR`                | `Card.tipoContrato`        |
| Invest./Despesa | coluna `INVEST/DESP`          | `Card.natureza`            |
| Material do kit | abas de COMPRA/ALMOX          | `Card.materiais[]`         |
| SC / PC         | colunas `SC` / `PC`           | `ItemMaterial.sc/.pc`      |
| Medição         | abas `MEDIÇÕES`               | etapa `MEDICOES`           |

---

## Fluxos Kanban

**A — Implantação (7 colunas, roteamento determinístico em `lib/routing.ts`):**
Comercial → Coordenação · Aprovação → **Suprimentos** → Monitoramento →
Técnica · Execução → Coordenação · Auditoria → Medição.

Bifurcação dentro de **Suprimentos**: na **Venda**, o card passa pelo
Almoxarifado (campo de texto "lista do que falta") antes de Compras; na
**Locação**, vai direto a Compras (100% dos itens). Gates obrigatórios:
aprovação inicial, conta criada no Monitoramento, checklist da Técnica e
auditoria final — o card só avança quando o gate da etapa é satisfeito.

**B — Manutenção:** Apontamento de Campo → Orçamentação → Aprovação → Compras/
Almoxarifado → Execução → Medições.

> Sugestão: a aba `DESATIVAR` das planilhas indica um **Fluxo C — Desativação**
> (cancelamento de conta + recolhimento de equipamentos + baixa no Sigma) que
> pode ser adicionado depois com a mesma estrutura.

---

## Próximos passos

1. Backend Node + Prisma + PostgreSQL com as rotas `/api/cards` e `/api/cards/:id/mover`.
2. TanStack Query no lugar do `useState` otimista (já preparado no board).
3. Autenticação por setor (RBAC) — cada coluna editável só pelo setor responsável.
4. Integração Sigma Cloud na etapa **Monitoramento** (criar conta) e **Medições**.
5. Importador de planilhas (`.xlsx`) para carga inicial do histórico.
```
```
