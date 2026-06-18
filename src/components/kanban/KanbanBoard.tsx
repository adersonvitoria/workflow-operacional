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
import { colunasDoFluxo } from "@/lib/flows";
import type { CardResumo, EtapaId, Fluxo } from "@/types";

interface KanbanBoardProps {
  fluxo: Fluxo;
  cards: CardResumo[];
  onAbrirCard: (id: string) => void;
  /** Persiste a mudança de etapa (chamada de API / mutation). */
  onMoverCard?: (cardId: string, novaEtapa: EtapaId) => void;
}

/**
 * Board genérico. Lê as colunas de `colunasDoFluxo(fluxo)` e distribui os cards
 * por etapa. O drag-and-drop entre colunas dispara `onMoverCard`.
 */
export function KanbanBoard({
  fluxo,
  cards,
  onAbrirCard,
  onMoverCard,
}: KanbanBoardProps) {
  const colunas = useMemo(() => colunasDoFluxo(fluxo), [fluxo]);

  // Estado local otimista — o board reflete o movimento antes da confirmação da API.
  const [itens, setItens] = useState<CardResumo[]>(cards);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);

  // Mantém em sincronia caso a prop `cards` mude (refetch).
  useEffect(() => setItens(cards), [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // dnd-kit gera IDs de acessibilidade não-determinísticos no SSR, o que causa
  // mismatch de hidratação. Renderizamos o DnD apenas no cliente.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const cardsPorEtapa = useMemo(() => {
    const mapa = new Map<EtapaId, CardResumo[]>();
    for (const col of colunas) mapa.set(col.id, []);
    for (const card of itens) mapa.get(card.etapa)?.push(card);
    return mapa;
  }, [colunas, itens]);

  const cardArrastado = itens.find((c) => c.id === arrastandoId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setArrastandoId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setArrastandoId(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    // O "over" pode ser uma coluna (droppable) ou outro card (sortable).
    const etapaDestino = (over.data.current?.etapa ??
      over.id) as EtapaId;

    const card = itens.find((c) => c.id === cardId);
    if (!card || card.etapa === etapaDestino) return;

    // Atualização otimista
    setItens((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, etapa: etapaDestino } : c)),
    );
    onMoverCard?.(cardId, etapaDestino);
  }

  // Placeholder (SSR / antes da montagem) — mesma moldura, sem hooks de DnD.
  if (!montado) {
    return (
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {colunas.map((coluna) => (
          <div
            key={coluna.id}
            className="flex w-80 shrink-0 flex-col rounded-xl bg-surface-board"
          >
            <div className={`h-1 rounded-t-xl ${coluna.accent}`} />
            <div className="px-3 pb-2 pt-3">
              <h2 className="text-sm font-semibold text-slate-800">
                {coluna.titulo}
                <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
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
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {colunas.map((coluna) => (
          <KanbanColumn
            key={coluna.id}
            coluna={coluna}
            cards={cardsPorEtapa.get(coluna.id) ?? []}
            onAbrirCard={onAbrirCard}
          />
        ))}
      </div>

      {/* Overlay arrastado — segue o cursor com sombra acentuada. */}
      <DragOverlay>
        {cardArrastado ? (
          <KanbanCard card={cardArrastado} onAbrir={() => {}} arrastando />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
