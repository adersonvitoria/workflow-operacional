"use client";

import { useState } from "react";
import { CRITICIDADE_META, MODALIDADE_META, STATUS_META, TURNO_META } from "@/lib/flows";
import { contarFiltrosAvancados, FILTROS_VAZIO, type FiltrosBoard } from "@/lib/board-filtros";
import type { CardStatus, Criticidade, Fluxo, Modalidade, Prioridade, Turno } from "@/types";

interface BoardFiltrosProps {
  fluxo: Fluxo;
  competencias: string[];
  filtros: FiltrosBoard;
  setFiltros: (f: FiltrosBoard) => void;
}

const STATUS: CardStatus[] = ["EM_ANDAMENTO", "AGUARDANDO_APROVACAO", "CONCLUIDO", "FINALIZADO", "TRAVADO"];
const PRIORIDADES: Prioridade[] = ["BAIXA", "NORMAL", "ALTA", "URGENTE"];
const PRIORIDADE_ROTULO: Record<Prioridade, string> = { BAIXA: "Baixa", NORMAL: "Normal", ALTA: "Alta", URGENTE: "Urgente" };
const TURNOS: Turno[] = ["MANHA", "TARDE", "DIA"];
const MODALIDADES: Modalidade[] = ["LOCACAO", "VENDA"];
const CRITICIDADES: Criticidade[] = ["ALTA", "MEDIA", "BAIXA"];

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

/** Busca ao vivo + painel de filtros avançados, no padrão visual do sistema. */
export function BoardFiltros({ fluxo, competencias, filtros, setFiltros }: BoardFiltrosProps) {
  const [aberto, setAberto] = useState(false);
  const set = <K extends keyof FiltrosBoard>(k: K, v: FiltrosBoard[K]) => setFiltros({ ...filtros, [k]: v });
  const ativos = contarFiltrosAvancados(filtros);

  return (
    <>
      {/* Busca ao vivo */}
      <div className="relative">
        <svg className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={filtros.busca}
          onChange={(e) => set("busca", e.target.value)}
          placeholder="Pesquisar cards…"
          className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        {filtros.busca && (
          <button onClick={() => set("busca", "")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" aria-label="Limpar busca">✕</button>
        )}
      </div>

      {/* Botão de filtros avançados + painel */}
      <div className="relative">
        <button
          onClick={() => setAberto((v) => !v)}
          className={[
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
            aberto || ativos > 0
              ? "border-brand text-brand ring-1 ring-inset ring-brand/30"
              : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
          ].join(" ")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          Filtros
          {ativos > 0 && <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{ativos}</span>}
        </button>

        {aberto && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setAberto(false)} />
            <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Filtros avançados</span>
                <button onClick={() => setFiltros({ ...FILTROS_VAZIO, busca: filtros.busca })} className="text-[11px] font-medium text-brand hover:underline disabled:text-slate-300" disabled={ativos === 0}>Limpar</button>
              </div>

              <div className="space-y-2.5">
                <Campo label="Status">
                  <select value={filtros.status} onChange={(e) => set("status", e.target.value)} className={selectCls}>
                    <option value="">Todos</option>
                    {STATUS.map((s) => <option key={s} value={s}>{STATUS_META[s].rotulo}</option>)}
                  </select>
                </Campo>

                <Campo label="Prioridade">
                  <select value={filtros.prioridade} onChange={(e) => set("prioridade", e.target.value)} className={selectCls}>
                    <option value="">Todas</option>
                    {PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDADE_ROTULO[p]}</option>)}
                  </select>
                </Campo>

                {fluxo === "MANUTENCAO" && (
                  <>
                    <Campo label="Turno de atendimento">
                      <select value={filtros.turno} onChange={(e) => set("turno", e.target.value)} className={selectCls}>
                        <option value="">Todos</option>
                        {TURNOS.map((t) => <option key={t} value={t}>{TURNO_META[t].rotulo}</option>)}
                      </select>
                    </Campo>
                    <Campo label="Criticidade">
                      <select value={filtros.criticidade} onChange={(e) => set("criticidade", e.target.value)} className={selectCls}>
                        <option value="">Todas</option>
                        {CRITICIDADES.map((c) => <option key={c} value={c}>{CRITICIDADE_META[c].rotulo}</option>)}
                      </select>
                    </Campo>
                  </>
                )}

                {fluxo === "IMPLANTACAO" && (
                  <Campo label="Modalidade">
                    <select value={filtros.modalidade} onChange={(e) => set("modalidade", e.target.value)} className={selectCls}>
                      <option value="">Todas</option>
                      {MODALIDADES.map((m) => <option key={m} value={m}>{MODALIDADE_META[m].rotulo}</option>)}
                    </select>
                  </Campo>
                )}

                <Campo label="Competência">
                  <select value={filtros.competencia} onChange={(e) => set("competencia", e.target.value)} className={selectCls}>
                    <option value="">Todas</option>
                    {competencias.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Campo>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
