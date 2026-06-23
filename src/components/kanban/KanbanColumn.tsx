"use client";

import { Fragment } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";
import { diaVisita, formatarBRL, rotuloDiaVisita } from "@/lib/flows";
import type { ColunaConfig } from "@/lib/flows";
import type { Card } from "@/types";

interface KanbanColumnProps {
  coluna: ColunaConfig;
  cards: Card[];
  onAbrirCard: (id: string) => void;
}

/**
 * Coluna do board: cabeçalho com contador + soma, área "droppable" e a lista
 * ordenável de cards. A largura é fixa para permitir scroll horizontal do board.
 */
export function KanbanColumn({ coluna, cards, onAbrirCard }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: coluna.id,
    data: { tipo: "coluna" },
  });

  const somaTotal = cards.reduce(
    (acc, c) => acc + (c.valores.total ?? c.valores.mensal ?? 0),
    0,
  );

  // A Rotina é segregada por dia da visita (cabeçalho antes de cada novo dia).
  const agruparPorDia = coluna.id === "ROTINA";

  return (
    <section className="flex min-w-0 flex-1 flex-col rounded-xl bg-surface-board dark:bg-slate-900/60">
      {/* Trilho de cor + cabeçalho (altura fixa para alinhar as listas) */}
      <div className={`h-1 rounded-t-xl ${coluna.accent}`} />
      <header className="px-3 pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={coluna.titulo}>
            {coluna.titulo}
          </h2>
          <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {cards.length}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 min-h-[2rem] text-[11px] leading-tight text-slate-400" title={coluna.descricao}>
          {coluna.descricao}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {somaTotal > 0 ? formatarBRL(somaTotal) : " "}
        </p>
      </header>

      {/* Lista de cards (droppable) */}
      <div
        ref={setNodeRef}
        className={[
          "flex-1 space-y-2 overflow-y-auto px-2 pb-3 transition-colors scrollbar-hide",
          isOver ? "bg-brand/5 ring-2 ring-inset ring-brand/20" : "",
        ].join(" ")}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card, i) => {
            const novoDia = agruparPorDia && (i === 0 || diaVisita(cards[i - 1]) !== diaVisita(card));
            return (
              <Fragment key={card.id}>
                {novoDia && (
                  <div className="sticky top-0 z-[1] flex items-center gap-1.5 rounded-md bg-slate-200/85 px-2 py-1 text-[11px] font-semibold text-slate-600 backdrop-blur dark:bg-slate-700/85 dark:text-slate-200">
                    <span aria-hidden>📅</span>
                    {rotuloDiaVisita(diaVisita(card))}
                  </div>
                )}
                <KanbanCard card={card} onAbrir={onAbrirCard} />
              </Fragment>
            );
          })}
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-400">
            Sem cards
          </div>
        )}
      </div>
    </section>
  );
}
