"use client";

import { useMemo, useState } from "react";
import { useCards } from "@/lib/store";
import { diaVisita, TURNO_META } from "@/lib/flows";
import type { Card, Turno } from "@/types";

// Faixa horária por turno (horas do dia).
const FAIXA: Record<Turno, { ini: number; fim: number; rotulo: string }> = {
  MANHA: { ini: 8, fim: 12, rotulo: "Manhã" },
  TARDE: { ini: 13, fim: 18, rotulo: "Tarde" },
  DIA: { ini: 8, fim: 18, rotulo: "Dia" },
};
const DIA_INI = 8;
const DIA_FIM = 18;
const TOTAL_H = DIA_FIM - DIA_INI; // 10h
const HORA_PX = 56;
const HORAS = Array.from({ length: TOTAL_H }, (_, i) => DIA_INI + i); // 8..17
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function inicioSemana(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // volta ao domingo
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
  iniMin: number;
  fimMin: number;
  lane: number;
  lanes: number;
}

/** Empacota eventos do dia em "lanes" para os que se sobrepõem ficarem lado a lado. */
function montarEventos(cards: Card[]): Evento[] {
  const base = cards.map((c) => {
    const turno = (c.manutencao?.turno ?? "DIA") as Turno;
    const f = FAIXA[turno];
    return {
      id: c.id,
      cliente: c.cliente.nome,
      tecnico: c.manutencao?.tecnico,
      auxiliar: c.manutencao?.auxiliarTecnico,
      turno,
      iniMin: (f.ini - DIA_INI) * 60,
      fimMin: (f.fim - DIA_INI) * 60,
      lane: 0,
      lanes: 1,
    } as Evento;
  });
  base.sort((a, b) => a.iniMin - b.iniMin || a.fimMin - b.fimMin);
  const lanes: Evento[][] = [];
  for (const ev of base) {
    let idx = lanes.findIndex((l) => l.every((e) => e.fimMin <= ev.iniMin || e.iniMin >= ev.fimMin));
    if (idx === -1) { lanes.push([ev]); idx = lanes.length - 1; }
    else lanes[idx].push(ev);
    ev.lane = idx;
  }
  for (const ev of base) ev.lanes = lanes.length;
  return base;
}

export function CalendarioView() {
  const { porFluxo } = useCards();
  const [semana, setSemana] = useState<Date>(() => inicioSemana(new Date()));

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDias(semana, i)), [semana]);
  const hojeStr = ymd(new Date());

  // Rotinas (Manutenção) com data de visita.
  const rotinas = useMemo(
    () => porFluxo("MANUTENCAO").filter((c) => c.etapa === "ROTINA" && !!diaVisita(c)),
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
      mapa.set(ds, montarEventos(rotinas.filter((c) => diaVisita(c) === ds)));
    }
    return mapa;
  }, [dias, rotinas]);

  const rangeLabel = `${dias[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${dias[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Calendário</h1>
          <p className="text-xs text-slate-400">Agenda de visitas (Rotina · Manutenção){semData > 0 ? ` · ${semData} sem data de visita` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSemana((s) => addDias(s, -7))} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Semana anterior">‹</button>
          <button onClick={() => setSemana(inicioSemana(new Date()))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hoje</button>
          <button onClick={() => setSemana((s) => addDias(s, 7))} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Próxima semana">›</button>
          <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">{rangeLabel}</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto bg-surface-app p-4 scrollbar-hide dark:bg-slate-950">
        <div className="min-w-[760px] rounded-card border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          {/* Cabeçalho dos dias */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <div className="w-14 shrink-0" />
            {dias.map((d) => {
              const ehHoje = ymd(d) === hojeStr;
              return (
                <div key={ymd(d)} className={["flex-1 border-l border-slate-200 px-2 py-2 text-center dark:border-slate-800", ehHoje ? "bg-brand/5" : ""].join(" ")}>
                  <p className="text-[11px] font-medium uppercase text-slate-400">{DIAS_SEMANA[d.getDay()]}</p>
                  <p className={["text-sm font-semibold", ehHoje ? "text-brand" : "text-slate-700 dark:text-slate-200"].join(" ")}>{d.getDate()}</p>
                </div>
              );
            })}
          </div>

          {/* Grade de horários */}
          <div className="flex">
            {/* Gutter de horas */}
            <div className="w-14 shrink-0">
              {HORAS.map((h) => (
                <div key={h} style={{ height: HORA_PX }} className="relative border-b border-slate-100 dark:border-slate-800/60">
                  <span className="absolute -top-2 right-1.5 text-[10px] text-slate-400">{hhmm(h)}</span>
                </div>
              ))}
              <div className="relative h-0"><span className="absolute -top-2 right-1.5 text-[10px] text-slate-400">{hhmm(DIA_FIM)}</span></div>
            </div>

            {/* Colunas dos dias */}
            {dias.map((d) => {
              const evs = eventosPorDia.get(ymd(d)) ?? [];
              const ehHoje = ymd(d) === hojeStr;
              return (
                <div key={ymd(d)} className={["relative flex-1 border-l border-slate-200 dark:border-slate-800", ehHoje ? "bg-brand/5" : ""].join(" ")} style={{ height: HORA_PX * TOTAL_H }}>
                  {/* Linhas de hora */}
                  {HORAS.map((h) => (
                    <div key={h} style={{ height: HORA_PX }} className="border-b border-slate-100 dark:border-slate-800/60" />
                  ))}
                  {/* Eventos */}
                  {evs.map((ev) => {
                    const top = (ev.iniMin / (TOTAL_H * 60)) * 100;
                    const height = ((ev.fimMin - ev.iniMin) / (TOTAL_H * 60)) * 100;
                    const largura = 100 / ev.lanes;
                    const meta = TURNO_META[ev.turno];
                    return (
                      <div
                        key={ev.id}
                        className={`absolute overflow-hidden rounded-md border px-1.5 py-1 text-[11px] shadow-sm ring-1 ring-inset ${meta.classe}`}
                        style={{ top: `${top}%`, height: `calc(${height}% - 4px)`, left: `calc(${ev.lane * largura}% + 2px)`, width: `calc(${largura}% - 4px)` }}
                        title={`${ev.cliente} · ${meta.rotulo}\nTécnico: ${ev.tecnico ?? "—"}\nAuxiliar: ${ev.auxiliar ?? "—"}`}
                      >
                        <p className="truncate font-semibold">{ev.cliente}</p>
                        <p className="truncate opacity-90">Téc.: {ev.tecnico ?? "—"}</p>
                        <p className="truncate opacity-90">Aux.: {ev.auxiliar ?? "—"}</p>
                        <p className="mt-0.5 text-[10px] opacity-70">{FAIXA[ev.turno].rotulo} · {hhmm(FAIXA[ev.turno].ini)}–{hhmm(FAIXA[ev.turno].fim)}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
