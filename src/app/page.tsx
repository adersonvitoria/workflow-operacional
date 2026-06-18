"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CardSlideOver } from "@/components/kanban/CardSlideOver";
import {
  CARDS_IMPLANTACAO,
  CARDS_MANUTENCAO,
  DETALHE_EXEMPLO,
} from "@/lib/mock-data";
import type { Card, Fluxo } from "@/types";

export default function Page() {
  const [nav, setNav] = useState("implantacoes");
  const [fluxo, setFluxo] = useState<Fluxo>("IMPLANTACAO");
  const [detalhe, setDetalhe] = useState<Card | null>(null);

  const fluxoAtivo: Fluxo = nav === "manutencoes" ? "MANUTENCAO" : "IMPLANTACAO";
  const cards = fluxoAtivo === "IMPLANTACAO" ? CARDS_IMPLANTACAO : CARDS_MANUTENCAO;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        ativo={nav}
        onSelecionar={(id) => {
          setNav(id);
          if (id === "manutencoes") setFluxo("MANUTENCAO");
          if (id === "implantacoes") setFluxo("IMPLANTACAO");
        }}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {fluxoAtivo === "IMPLANTACAO"
                ? "Esteira de Implantação"
                : "Esteira de Manutenção"}
            </h1>
            <p className="text-xs text-slate-400">
              {fluxoAtivo === "IMPLANTACAO"
                ? "Novos projetos · Comercial → Faturamento"
                : "Serviços extras e orçamentos"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Filtros
            </button>
            <button className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
              + Nova entrada
            </button>
          </div>
        </header>

        {/* Board */}
        <div className="min-h-0 flex-1">
          <KanbanBoard
            fluxo={fluxoAtivo}
            cards={cards}
            onAbrirCard={() => setDetalhe(DETALHE_EXEMPLO)}
            onMoverCard={(id, etapa) =>
              console.log(`Card ${id} movido para ${etapa}`)
            }
          />
        </div>
      </main>

      <CardSlideOver card={detalhe} onFechar={() => setDetalhe(null)} />
    </div>
  );
}
