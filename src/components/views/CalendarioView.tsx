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
const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

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
}

function montarEventos(cards: Card[]): Evento[] {
  return cards
    .map((c) => ({
      id: c.id,
      cliente: c.cliente.nome,
      tecnico: c.manutencao?.tecnico,
      auxiliar: c.manutencao?.auxiliarTecnico,
      turno: (c.manutencao?.turno ?? "DIA") as Turno,
    }))
    .sort((a, b) => FAIXA[a.turno].ini - FAIXA[b.turno].ini || a.cliente.localeCompare(b.cliente));
}

export function CalendarioView() {
  const { porFluxo } = useCards();
  const [semana, setSemana] = useState<Date>(() => inicioSemana(new Date()));

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDias(semana, i)), [semana]);
  const hojeStr = ymd(new Date());

  // Eventos = qualquer card de Manutenção com data de visita (independe da etapa
  // atual). O evento permanece mesmo quando o card sai da Rotina; só some quando
  // o card é excluído.
  const agendados = useMemo(
    () => porFluxo("MANUTENCAO").filter((c) => !!diaVisita(c)),
    [porFluxo],
  );
  // Rotinas ainda sem data de visita (a agendar).
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
          <p className="text-xs text-slate-400">Agenda de visitas (Manutenção) · {totalSemana} na semana{semData > 0 ? ` · ${semData} rotina(s) a agendar` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSemana((s) => addDias(s, -7))} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Semana anterior">‹</button>
          <button onClick={() => setSemana(inicioSemana(new Date()))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hoje</button>
          <button onClick={() => setSemana((s) => addDias(s, 7))} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Próxima semana">›</button>
          <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">{rangeLabel}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface-app p-4 scrollbar-hide dark:bg-slate-950">
        <div className="mx-auto max-w-5xl space-y-2">
          {dias.map((d) => {
            const evs = eventosPorDia.get(ymd(d)) ?? [];
            const ehHoje = ymd(d) === hojeStr;
            return (
              <section key={ymd(d)} className={["flex gap-3 rounded-card border bg-white p-3 shadow-card dark:bg-slate-900", ehHoje ? "border-brand/40 ring-1 ring-brand/20" : "border-slate-200 dark:border-slate-800"].join(" ")}>
                {/* Coluna do dia */}
                <div className="w-24 shrink-0 border-r border-slate-100 pr-3 dark:border-slate-800">
                  <p className={["text-xs font-semibold uppercase", ehHoje ? "text-brand" : "text-slate-400"].join(" ")}>{DIAS_SEMANA[d.getDay()].slice(0, 3)}</p>
                  <p className={["text-2xl font-bold leading-tight", ehHoje ? "text-brand" : "text-slate-700 dark:text-slate-200"].join(" ")}>{d.getDate()}</p>
                  <p className="text-[11px] text-slate-400">{d.toLocaleDateString("pt-BR", { month: "short" })}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{evs.length} {evs.length === 1 ? "visita" : "visitas"}</p>
                </div>

                {/* Cards horizontais (quebram em várias linhas) */}
                <div className="flex min-w-0 flex-1 flex-wrap content-start gap-2">
                  {evs.length === 0 ? (
                    <p className="self-center text-sm text-slate-300 dark:text-slate-600">Sem visitas</p>
                  ) : (
                    evs.map((ev) => {
                      const f = FAIXA[ev.turno];
                      const meta = TURNO_META[ev.turno];
                      return (
                        <div key={ev.id} className={`w-60 max-w-full rounded-lg border px-3 py-2 text-xs ring-1 ring-inset ${meta.classe}`}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="font-semibold">{hhmm(f.ini)} – {hhmm(f.fim)}</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-black/20">
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.ponto}`} />{meta.rotulo}
                            </span>
                          </div>
                          <p className="break-words text-sm font-semibold leading-snug">{ev.cliente}</p>
                          <p className="mt-1 break-words"><span className="opacity-70">Técnico:</span> {ev.tecnico || "—"}</p>
                          <p className="break-words"><span className="opacity-70">Auxiliar:</span> {ev.auxiliar || "—"}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
