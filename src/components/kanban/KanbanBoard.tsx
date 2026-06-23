"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { colunasDoFluxo, formatarBRL, type ColunaConfig } from "@/lib/flows";
import type { Card, EtapaId, Fluxo } from "@/types";

/** Item do board: uma coluna solta ou um grupo de colunas consecutivas. */
type ItemBoard =
  | { tipo: "coluna"; coluna: ColunaConfig }
  | { tipo: "grupo"; nome: string; colunas: ColunaConfig[] };

function agruparColunas(colunas: ColunaConfig[]): ItemBoard[] {
  const itens: ItemBoard[] = [];
  for (const coluna of colunas) {
    const ultimo = itens[itens.length - 1];
    if (coluna.grupo && ultimo?.tipo === "grupo" && ultimo.nome === coluna.grupo) {
      ultimo.colunas.push(coluna);
    } else if (coluna.grupo) {
      itens.push({ tipo: "grupo", nome: coluna.grupo, colunas: [coluna] });
    } else {
      itens.push({ tipo: "coluna", coluna });
    }
  }
  return itens;
}

const somaCards = (cards: Card[]) =>
  cards.reduce((acc, c) => acc + (c.valores.total ?? c.valores.mensal ?? 0), 0);

/** Container de um grupo de colunas com cabeçalho consolidado (contador + soma). */
function GrupoColunas({
  nome,
  colunas,
  cardsPorEtapa,
  onAbrirCard,
}: {
  nome: string;
  colunas: ColunaConfig[];
  cardsPorEtapa: Map<EtapaId, Card[]>;
  onAbrirCard: (id: string) => void;
}) {
  const todos = colunas.flatMap((c) => cardsPorEtapa.get(c.id) ?? []);
  const soma = somaCards(todos);
  return (
    <div
      className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-100/70 p-1.5 dark:border-slate-700 dark:bg-slate-800/40"
      style={{ flexGrow: colunas.length, flexShrink: 1, flexBasis: 0 }}
    >
      <header className="flex items-center justify-between px-2 py-1.5">
        <h2 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{nome}</h2>
        <span className="shrink-0 pl-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          {todos.length}
          {soma > 0 ? ` · ${formatarBRL(soma)}` : ""}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 gap-1.5">
        {colunas.map((coluna) => (
          <KanbanColumn
            key={coluna.id}
            coluna={coluna}
            cards={cardsPorEtapa.get(coluna.id) ?? []}
            onAbrirCard={onAbrirCard}
          />
        ))}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  fluxo: Fluxo;
  cards: Card[];
  onAbrirCard: (id: string) => void;
  /** Persiste a mudança de etapa (validação fica no store/rota). */
  onMoverCard?: (cardId: string, novaEtapa: EtapaId) => void;
}

/**
 * Board controlado: a lista de cards vem por prop (store é a fonte da verdade).
 * O drag-and-drop apenas dispara `onMoverCard`; quem valida é o store.
 */
export function KanbanBoard({ fluxo, cards, onAbrirCard, onMoverCard }: KanbanBoardProps) {
  const colunas = useMemo(() => colunasDoFluxo(fluxo), [fluxo]);
  const itens = useMemo(() => agruparColunas(colunas), [colunas]);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);

  // dnd-kit gera IDs de acessibilidade não-determinísticos no SSR → render só no cliente.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const cardsPorEtapa = useMemo(() => {
    const mapa = new Map<EtapaId, Card[]>();
    for (const col of colunas) mapa.set(col.id, []);
    for (const card of cards) mapa.get(card.etapa)?.push(card);
    return mapa;
  }, [colunas, cards]);

  const cardArrastado = cards.find((c) => c.id === arrastandoId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setArrastandoId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setArrastandoId(null);
    const { active, over } = event;
    if (!over) return;
    const cardId = String(active.id);
    const etapaDestino = (over.data.current?.etapa ?? over.id) as EtapaId;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.etapa === etapaDestino) return;
    onMoverCard?.(cardId, etapaDestino);
  }

  if (!montado) {
    return (
      <div className="flex h-full gap-3 overflow-x-auto p-4 scrollbar-hide">
        {colunas.map((coluna) => (
          <div key={coluna.id} className="flex min-w-0 flex-1 flex-col rounded-xl bg-surface-board dark:bg-slate-900/60">
            <div className={`h-1 rounded-t-xl ${coluna.accent}`} />
            <div className="px-3 pb-2 pt-3">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {coluna.titulo}
                <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {(cardsPorEtapa.get(coluna.id) ?? []).length}
                </span>
              </h2>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-4 scrollbar-hide">
        {itens.map((item) =>
          item.tipo === "coluna" ? (
            <KanbanColumn
              key={item.coluna.id}
              coluna={item.coluna}
              cards={cardsPorEtapa.get(item.coluna.id) ?? []}
              onAbrirCard={onAbrirCard}
            />
          ) : (
            <GrupoColunas
              key={item.nome}
              nome={item.nome}
              colunas={item.colunas}
              cardsPorEtapa={cardsPorEtapa}
              onAbrirCard={onAbrirCard}
            />
          ),
        )}
      </div>

      <DragOverlay>
        {cardArrastado ? <KanbanCard card={cardArrastado} onAbrir={() => {}} arrastando /> : null}
      </DragOverlay>
    </DndContext>
  );
}
