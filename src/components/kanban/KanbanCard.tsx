"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COMPLEMENTAR_META, CONFERENCIA_META, criticidadeDoCard, CRITICIDADE_META, formatarBRL, horasParado, MODALIDADE_META, nivelSla, SLA_META, STATUS_META, TURNO_META } from "@/lib/flows";
import type { Card } from "@/types";

interface KanbanCardProps {
  card: Card;
  onAbrir: (id: string) => void;
  /** Quando true, é o "overlay" arrastado — sem listeners, com sombra forte. */
  arrastando?: boolean;
}

/**
 * Card de resumo exibido na coluna. Mostra: cliente, valor, status,
 * responsável atual e tipo de contrato. Clicar abre o slide-over de detalhes.
 */
export function KanbanCard({ card, onAbrir, arrastando }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { etapa: card.etapa } });

  const status = STATUS_META[card.status];
  const criticidade = criticidadeDoCard(card);
  const sla = nivelSla(card);
  const encerrado = card.status === "CONCLUIDO" || card.status === "FINALIZADO";
  const horas = horasParado(card);
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onAbrir(card.id)}
      className={[
        "group cursor-grab rounded-card border p-3 shadow-card transition hover:shadow-md active:cursor-grabbing",
        SLA_META[sla].fundo,
        isDragging ? "opacity-40" : "",
        arrastando ? "rotate-1 shadow-card-drag ring-2 ring-brand/30" : "",
      ].join(" ")}
    >
      {/* Cabeçalho: código + status empilhados (cabem em colunas estreitas) */}
      <header className="mb-2 space-y-1">
        <span className="block truncate font-mono text-[11px] font-medium text-slate-400">
          #{card.codigo}
        </span>
        <span
          className={`inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${status.classe}`}
          title={status.rotulo}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.ponto}`} />
          <span className="truncate">{status.rotulo}</span>
        </span>
      </header>

      {/* Cliente */}
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
        {card.cliente.nome}
      </h3>

      {/* Metadados */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        {card.complementar && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${COMPLEMENTAR_META.classe}`}
            title="Orçamento complementar"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${COMPLEMENTAR_META.ponto}`} />
            {COMPLEMENTAR_META.rotulo}
          </span>
        )}
        {card.conferenciaSuprimentos && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${CONFERENCIA_META.classe}`}
            title="Voltou do Suprimentos para conferência no Almoxarifado"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${CONFERENCIA_META.ponto}`} />
            {CONFERENCIA_META.rotulo}
          </span>
        )}
        {card.manutencao?.turno && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${TURNO_META[card.manutencao.turno].classe}`}
            title={`Turno ${TURNO_META[card.manutencao.turno].rotulo}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${TURNO_META[card.manutencao.turno].ponto}`} />
            {TURNO_META[card.manutencao.turno].rotulo}
          </span>
        )}
        {criticidade && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${CRITICIDADE_META[criticidade].classe}`}
            title={`Criticidade ${CRITICIDADE_META[criticidade].rotulo}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${CRITICIDADE_META[criticidade].ponto}`} />
            {CRITICIDADE_META[criticidade].rotulo}
          </span>
        )}
        {card.modalidade && (
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${MODALIDADE_META[card.modalidade].classe}`}
          >
            {MODALIDADE_META[card.modalidade].rotulo}
          </span>
        )}
        {card.cr && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500">
            CR {card.cr}
          </span>
        )}
        {card.prioridade === "URGENTE" && (
          <span className="rounded bg-rose-100 px-1.5 py-0.5 font-medium text-rose-600">
            Urgente
          </span>
        )}
        {!encerrado && (
          <span className={`rounded px-1.5 py-0.5 font-semibold ${SLA_META[sla].selo}`} title={`Parado há ${horas}h nesta coluna`}>
            ⏱ {horas >= 24 ? `${Math.floor(horas / 24)}d ${horas % 24}h` : `${horas}h`}
          </span>
        )}
      </div>

      {/* Rodapé: valor + responsável */}
      <footer className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {formatarBRL(card.valores.total ?? card.valores.mensal)}
          {card.valores.total == null && card.valores.mensal != null && (
            <span className="text-[10px] font-normal text-slate-400">/mês</span>
          )}
        </span>
        {card.responsavelAtual?.pessoa && (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-navy text-[10px] font-semibold text-white"
            title={card.responsavelAtual.pessoa}
          >
            {iniciais(card.responsavelAtual.pessoa)}
          </span>
        )}
      </footer>
    </article>
  );
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeiro = partes[0]?.[0] ?? "";
  const ultimo = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeiro + ultimo).toUpperCase();
}
