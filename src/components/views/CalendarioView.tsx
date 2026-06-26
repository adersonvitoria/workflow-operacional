"use client";

import { useMemo, useState } from "react";
import { useCards } from "@/lib/store";
import { diaVisita, TURNO_META } from "@/lib/flows";
import type { Card, Turno } from "@/types";

// Faixa horária por turno.
const FAIXA: Record<Turno, { ini: number; fim: number; rotulo: string }> = {
  MANHA: { ini: 8, fim: 12, rotulo: "Manhã" },
  TARDE: { ini: 13, fim: 18, rotulo: "Tarde" },
  DIA: { ini: 8, fim: 18, rotulo: "Dia" },
};
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Estilo do card quando a visita não está agendada (vermelho).
const NAO_AGENDADO_CLASSE = "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/40";

function inicioSemana(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // domingo
  return x;
}
function addDias(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hhmm(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

interface Evento {
  id: string;
  cliente: string;
  tecnico?: string;
  auxiliar?: string;
  turno: Turno;
  naoAgendado: boolean;
}

function montarEventos(cards: Card[]): Evento[] {
  return cards
    .map((c) => ({
      id: c.id,
      cliente: c.cliente.nome,
      tecnico: c.manutencao?.tecnico,
      auxiliar: c.manutencao?.auxiliarTecnico,
      turno: (c.manutencao?.turno ?? "DIA") as Turno,
      naoAgendado: c.manutencao?.agendado !== true,
    }))
    .sort((a, b) => FAIXA[a.turno].ini - FAIXA[b.turno].ini || a.cliente.localeCompare(b.cliente));
}

export function CalendarioView() {
  const { porFluxo } = useCards();
  const [semana, setSemana] = useState<Date>(() => inicioSemana(new Date()));

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDias(semana, i)), [semana]);
  const hojeStr = ymd(new Date());

  // Eventos = qualquer card de Manutenção com data de visita (independe da etapa).
  // Permanece mesmo quando o card sai da Rotina; só some quando é excluído.
  const agendados = useMemo(
    () => porFluxo("MANUTENCAO").filter((c) => !!diaVisita(c)),
    [porFluxo],
  );
  const semData = useMemo(
    () => porFluxo("MANUTENCAO").filter((c) => c.etapa === "ROTINA" && !diaVisita(c)).length,
    [porFluxo],
  );

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const d of dias) {
      const ds = ymd(d);
      mapa.set(ds, montarEventos(agendados.filter((c) => diaVisita(c) === ds)));
    }
    return mapa;
  }, [dias, agendados]);

  const rangeLabel = `${dias[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${dias[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  const totalSemana = dias.reduce((s, d) => s + (eventosPorDia.get(ymd(d))?.length ?? 0), 0);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Calendário</h1>
          <p className="text-xs text-slate-400">Semana · {totalSemana} visita(s){semData > 0 ? ` · ${semData} rotina(s) a agendar` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Legenda de cores por turno */}
          <div className="mr-2 hidden items-center gap-2 text-[11px] text-slate-500 sm:flex dark:text-slate-400">
            {(["MANHA", "TARDE", "DIA"] as Turno[]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${TURNO_META[t].ponto}`} />{FAIXA[t].rotulo}</span>
            ))}
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Não agendado</span>
          </div>
          <button onClick={() => setSemana((s) => addDias(s, -7))} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Semana anterior">‹</button>
          <button onClick={() => setSemana(inicioSemana(new Date()))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hoje</button>
          <button onClick={() => setSemana((s) => addDias(s, 7))} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Próxima semana">›</button>
          <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">{rangeLabel}</span>
        </div>
      </header>

      {/* Visão semanal: 7 colunas (rola na horizontal quando não couber) */}
      <div className="flex-1 overflow-auto bg-surface-app p-4 scrollbar-hide dark:bg-slate-950">
        <div className="flex gap-2">
          {dias.map((d) => {
            const evs = eventosPorDia.get(ymd(d)) ?? [];
            const ehHoje = ymd(d) === hojeStr;
            return (
              <div key={ymd(d)} className={["flex w-56 shrink-0 flex-col self-start rounded-card border bg-white shadow-card dark:bg-slate-900", ehHoje ? "border-brand/40 ring-1 ring-brand/20" : "border-slate-200 dark:border-slate-800"].join(" ")}>
                <header className={["rounded-t-card border-b border-slate-200 px-3 py-2 text-center dark:border-slate-800", ehHoje ? "bg-brand/5" : ""].join(" ")}>
                  <p className={["text-[11px] font-semibold uppercase", ehHoje ? "text-brand" : "text-slate-400"].join(" ")}>{DIAS_SEMANA[d.getDay()]}</p>
                  <p className={["text-lg font-bold leading-tight", ehHoje ? "text-brand" : "text-slate-700 dark:text-slate-200"].join(" ")}>
                    {d.getDate()} <span className="text-[11px] font-normal text-slate-400">{d.toLocaleDateString("pt-BR", { month: "short" })}</span>
                  </p>
                </header>

                <div className="flex-1 space-y-3 p-2">
                  {evs.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-slate-300 dark:text-slate-600">Sem visitas</p>
                  ) : (
                    (["MANHA", "TARDE", "DIA"] as Turno[])
                      .map((t) => ({ t, itens: evs.filter((e) => e.turno === t) }))
                      .filter((g) => g.itens.length > 0)
                      .map((g) => (
                        <div key={g.t} className="space-y-1.5">
                          <p className="flex items-center gap-1.5 border-b border-slate-100 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                            <span className={`h-2 w-2 rounded-full ${TURNO_META[g.t].ponto}`} />
                            {FAIXA[g.t].rotulo} <span className="text-slate-300 dark:text-slate-600">· {g.itens.length}</span>
                          </p>
                          {g.itens.map((ev) => {
                            const f = FAIXA[ev.turno];
                            const meta = TURNO_META[ev.turno];
                            const classe = ev.naoAgendado ? NAO_AGENDADO_CLASSE : meta.classe;
                            return (
                              <div key={ev.id} className={`rounded-lg border px-2.5 py-2 text-xs ring-1 ring-inset ${classe}`}>
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <span className="font-semibold">{hhmm(f.ini)} – {hhmm(f.fim)}</span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-black/20">
                                    <span className={`h-1.5 w-1.5 rounded-full ${meta.ponto}`} />{meta.rotulo}
                                  </span>
                                </div>
                                <p className="break-words text-sm font-semibold leading-snug">{ev.cliente}</p>
                                <p className="mt-1 break-words"><span className="opacity-70">Técnico:</span> {ev.tecnico || "—"}</p>
                                <p className="break-words"><span className="opacity-70">Auxiliar:</span> {ev.auxiliar || "—"}</p>
                                <p className="break-words"><span className="opacity-70">Agendado:</span> {ev.naoAgendado ? "Não" : "Sim"}</p>
                                {ev.naoAgendado && <p className="mt-1 font-semibold">⚠ Não agendado</p>}
                              </div>
                            );
                          })}
                        </div>
                      ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
