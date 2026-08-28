"use client";

import { useMemo, useState } from "react";
import { useCards } from "@/lib/store";
import { useTecnicos } from "@/lib/tecnicos-store";
import { criticidadeDoCard, CRITICIDADE_META, diaVisita, formatarBRL, TIPO_CLIENTE_META, TURNO_META } from "@/lib/flows";
import { rotuloEtapa } from "@/lib/routing";
import { MapaRegiao } from "@/components/views/MapaRegiao";
import type { Card, Turno } from "@/types";

const FAIXA: Record<Turno, { ini: number; fim: number; rotulo: string }> = {
  MANHA: { ini: 8, fim: 12, rotulo: "Manhã" },
  TARDE: { ini: 13, fim: 18, rotulo: "Tarde" },
  DIA: { ini: 8, fim: 18, rotulo: "Dia" },
};
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TURNO_ROTULO: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde", DIA: "Dia" };
// Vermelho do card quando a visita NÃO é cobrada.
const NAO_COBRADO_CLASSE = "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/40";

function inicioSemana(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
function addDias(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymd(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function hhmm(h: number): string { return `${String(h).padStart(2, "0")}:00`; }
function dataBR(iso?: string): string {
  if (!iso) return "—";
  // Datas "puras" (YYYY-MM-DD), como a data da visita, são formatadas sem fuso
  // para não cair em d-1 (UTC vs. horário do Brasil). Veja fmtData no CardSlideOver.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

interface Evento {
  id: string;
  cliente: string;
  tecnico?: string;
  auxiliar?: string;
  turno: Turno;
  naoAgendado: boolean;
  cobrado: boolean;
  tipoAtendimento?: string;
  setor?: string;
  regiao?: string;
  card: Card;
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
      cobrado: c.manutencao?.visitaCobrada === true,
      tipoAtendimento: c.manutencao?.tipoAtendimento,
      setor: c.manutencao?.setor,
      regiao: c.manutencao?.regiao,
      card: c,
    }))
    .sort((a, b) => FAIXA[a.turno].ini - FAIXA[b.turno].ini || a.cliente.localeCompare(b.cliente));
}

/**
 * Item unificado da agenda do dia: visita, orçamento ou execução de
 * implantação, todos posicionados PELO TURNO — o dia é organizado por
 * Manhã/Tarde/Dia, e não por tipo de card. Orçamentos usam o turno
 * cadastrado no card; a execução de implantação ocupa o dia inteiro.
 */
type ItemAgenda =
  | { categoria: "VISITA"; turno: Turno; cliente: string; ev: Evento }
  | { categoria: "ORCAMENTO"; turno: Turno; cliente: string; card: Card }
  | { categoria: "EXECUCAO"; turno: Turno; cliente: string; card: Card };

/** Dia local (YYYY-MM-DD) de um ISO datetime. */
function ymdIso(iso: string): string {
  return ymd(new Date(iso));
}

export function CalendarioView() {
  const { porFluxo } = useCards();
  const { ativos: pessoasAtivas } = useTecnicos();
  const [semana, setSemana] = useState<Date>(() => inicioSemana(new Date()));
  const [selecionado, setSelecionado] = useState<Card | null>(null);

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDias(semana, i)), [semana]);
  const hojeStr = ymd(new Date());

  const agendados = useMemo(() => porFluxo("MANUTENCAO").filter((c) => !!diaVisita(c)), [porFluxo]);
  const semData = useMemo(() => porFluxo("MANUTENCAO").filter((c) => c.etapa === "ROTINA" && !diaVisita(c)).length, [porFluxo]);

  // Implantação · Técnica-Execução: o card ocupa a agenda nos dias ÚTEIS do
  // período [início, fim] (sem fins de semana) enquanto estiver na execução.
  const execucoes = useMemo(
    () => porFluxo("IMPLANTACAO").filter((c) => c.etapa === "TECNICA" && c.dataInicioExecucao && c.dataFimExecucao),
    [porFluxo],
  );

  // Manutenção · tipo Orçamento: preenche a agenda no período [início, fim],
  // pulando os finais de semana. Sai da agenda ao encerrar.
  const orcamentos = useMemo(
    () => porFluxo("MANUTENCAO").filter((c) => c.etapa !== "ENCERRADOS" && c.manutencao?.tipo === "ORCAMENTO" && c.manutencao?.dataInicio && c.manutencao?.dataFim),
    [porFluxo],
  );

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const d of dias) { const ds = ymd(d); mapa.set(ds, montarEventos(agendados.filter((c) => diaVisita(c) === ds))); }
    return mapa;
  }, [dias, agendados]);

  const execucoesPorDia = useMemo(() => {
    const mapa = new Map<string, Card[]>();
    for (const d of dias) {
      const ds = ymd(d);
      const fimDeSemana = d.getDay() === 0 || d.getDay() === 6; // dom/sáb ficam fora
      mapa.set(ds, fimDeSemana ? [] : execucoes.filter((c) => ymdIso(c.dataInicioExecucao!) <= ds && ds <= ymdIso(c.dataFimExecucao!)));
    }
    return mapa;
  }, [dias, execucoes]);

  const orcamentosPorDia = useMemo(() => {
    const mapa = new Map<string, Card[]>();
    for (const d of dias) {
      const ds = ymd(d);
      const fimDeSemana = d.getDay() === 0 || d.getDay() === 6; // dom/sáb ficam fora
      mapa.set(ds, fimDeSemana ? [] : orcamentos.filter((c) => c.manutencao!.dataInicio! <= ds && ds <= c.manutencao!.dataFim!));
    }
    return mapa;
  }, [dias, orcamentos]);

  // Agenda unificada do dia, agrupada por turno (visitas + orçamentos +
  // execuções juntos, cada um mantendo o próprio visual de card).
  const itensPorDia = useMemo(() => {
    const mapa = new Map<string, ItemAgenda[]>();
    for (const d of dias) {
      const ds = ymd(d);
      const itens: ItemAgenda[] = [
        ...(eventosPorDia.get(ds) ?? []).map((ev): ItemAgenda => ({ categoria: "VISITA", turno: ev.turno, cliente: ev.cliente, ev })),
        ...(orcamentosPorDia.get(ds) ?? []).map((c): ItemAgenda => ({ categoria: "ORCAMENTO", turno: (c.manutencao?.turno ?? "DIA") as Turno, cliente: c.cliente.nome, card: c })),
        ...(execucoesPorDia.get(ds) ?? []).map((c): ItemAgenda => ({ categoria: "EXECUCAO", turno: "DIA" as Turno, cliente: c.cliente.nome, card: c })),
      ];
      itens.sort((a, b) => a.cliente.localeCompare(b.cliente));
      mapa.set(ds, itens);
    }
    return mapa;
  }, [dias, eventosPorDia, orcamentosPorDia, execucoesPorDia]);

  const diasVisiveis = useMemo(
    () => dias.filter((d) => (itensPorDia.get(ymd(d))?.length ?? 0) > 0),
    [dias, itensPorDia],
  );

  // Técnicos (somente tipo TÉCNICO, não terceiros) sem OS hoje.
  const semOSHoje = useMemo(() => {
    const atribuidos = new Set<string>();
    for (const c of agendados.filter((c) => diaVisita(c) === hojeStr)) {
      if (c.manutencao?.tecnico) atribuidos.add(c.manutencao.tecnico.trim().toLowerCase());
      if (c.manutencao?.auxiliarTecnico) atribuidos.add(c.manutencao.auxiliarTecnico.trim().toLowerCase());
    }
    return pessoasAtivas.filter((p) => p.tipo === "TECNICO" && !atribuidos.has(p.nome.trim().toLowerCase()));
  }, [agendados, hojeStr, pessoasAtivas]);

  const rangeLabel = `${dias[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${dias[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  const totalSemana = dias.reduce((s, d) => s + (eventosPorDia.get(ymd(d))?.length ?? 0), 0);
  const totalExec = dias.reduce((s, d) => s + (execucoesPorDia.get(ymd(d))?.length ?? 0), 0);
  const totalOrc = dias.reduce((s, d) => s + (orcamentosPorDia.get(ymd(d))?.length ?? 0), 0);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Calendário</h1>
          <p className="text-xs text-slate-400">Semana · {totalSemana} visita(s){totalOrc > 0 ? ` · ${totalOrc} orçamento(s)` : ""}{totalExec > 0 ? ` · ${totalExec} execução(ões) de implantação` : ""}{semData > 0 ? ` · ${semData} rotina(s) a agendar` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 hidden items-center gap-2 text-[11px] text-slate-500 sm:flex dark:text-slate-400">
            {(["MANHA", "TARDE", "DIA"] as Turno[]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${TURNO_META[t].ponto}`} />{FAIXA[t].rotulo}</span>
            ))}
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Não cobrado</span>
          </div>
          <button onClick={() => setSemana((s) => addDias(s, -7))} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Semana anterior">‹</button>
          <button onClick={() => setSemana(inicioSemana(new Date()))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hoje</button>
          <button onClick={() => setSemana((s) => addDias(s, 7))} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Próxima semana">›</button>
          <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">{rangeLabel}</span>
        </div>
      </header>

      {/* Alerta: técnicos sem OS hoje */}
      {semOSHoje.length > 0 && (
        <div className="flex items-start gap-2 border-b border-rose-300 bg-rose-600 px-6 py-2 text-sm font-semibold text-white">
          <span aria-hidden>⚠</span>
          <span className="min-w-0">ATENÇÃO, os técnicos {semOSHoje.map((p) => p.nome).join(", ")} estão sem OS no dia de HOJE</span>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-surface-app p-4 scrollbar-hide dark:bg-slate-950">
        <div className="flex gap-2">
          {diasVisiveis.length === 0 && (
            <div className="mx-auto mt-12 text-center text-sm text-slate-400">Nenhuma visita agendada nesta semana.</div>
          )}
          {diasVisiveis.map((d) => {
            const itens = itensPorDia.get(ymd(d)) ?? [];
            const ehHoje = ymd(d) === hojeStr;
            return (
              <div key={ymd(d)} className={["flex w-60 shrink-0 flex-col self-start rounded-card border bg-white shadow-card dark:bg-slate-900", ehHoje ? "border-brand/40 ring-1 ring-brand/20" : "border-slate-200 dark:border-slate-800"].join(" ")}>
                <header className={["rounded-t-card border-b border-slate-200 px-3 py-2 text-center dark:border-slate-800", ehHoje ? "bg-brand/5" : ""].join(" ")}>
                  <p className={["text-[11px] font-semibold uppercase", ehHoje ? "text-brand" : "text-slate-400"].join(" ")}>{DIAS_SEMANA[d.getDay()]}</p>
                  <p className={["text-lg font-bold leading-tight", ehHoje ? "text-brand" : "text-slate-700 dark:text-slate-200"].join(" ")}>{d.getDate()} <span className="text-[11px] font-normal text-slate-400">{d.toLocaleDateString("pt-BR", { month: "short" })}</span></p>
                </header>

                <div className="flex-1 space-y-3 p-2">
                  {/* Agenda do dia organizada POR TURNO: visitas, orçamentos e
                      execuções entram juntos no turno cadastrado, cada tipo com
                      o próprio visual de card. */}
                  {(["MANHA", "TARDE", "DIA"] as Turno[])
                    .map((t) => ({ t, grupo: itens.filter((i) => i.turno === t) }))
                    .filter((g) => g.grupo.length > 0)
                    .map((g) => (
                      <div key={g.t} className="space-y-1.5">
                        <p className="flex items-center gap-1.5 border-b border-slate-100 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                          <span className={`h-2 w-2 rounded-full ${TURNO_META[g.t].ponto}`} />
                          {FAIXA[g.t].rotulo} <span className="text-slate-300 dark:text-slate-600">· {g.grupo.length}</span>
                        </p>
                        {g.grupo.map((item) => {
                          if (item.categoria === "ORCAMENTO") {
                            const c = item.card;
                            return (
                              <button
                                key={`orc-${c.id}`}
                                type="button"
                                onClick={() => setSelecionado(c)}
                                className="block w-full rounded-lg border px-2.5 py-2 text-left text-xs ring-1 ring-inset transition hover:brightness-95 bg-indigo-50 text-indigo-800 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-500/40"
                              >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <span className="font-semibold">{dataBR(c.manutencao?.dataInicio)} – {dataBR(c.manutencao?.dataFim)}</span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-black/20"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Orçamento</span>
                                </div>
                                <p className="break-words text-sm font-semibold leading-snug">{c.cliente.nome}</p>
                                <p className="mt-1 break-words"><span className="opacity-70">Técnico:</span> {c.manutencao?.tecnico || "—"}</p>
                                <p className="break-words"><span className="opacity-70">Região:</span> {c.manutencao?.regiao || "—"}</p>
                                <p className="break-words"><span className="opacity-70">Nº orçamento:</span> {c.numeroOrcamento || "—"}</p>
                              </button>
                            );
                          }
                          if (item.categoria === "EXECUCAO") {
                            const c = item.card;
                            return (
                              <button
                                key={`exec-${c.id}`}
                                type="button"
                                onClick={() => setSelecionado(c)}
                                className="block w-full rounded-lg border px-2.5 py-2 text-left text-xs ring-1 ring-inset transition hover:brightness-95 bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-200 dark:ring-teal-500/40"
                              >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <span className="font-semibold">{dataBR(c.dataInicioExecucao)} – {dataBR(c.dataFimExecucao)}</span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-black/20"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" />Execução</span>
                                </div>
                                <p className="break-words text-sm font-semibold leading-snug">{c.cliente.nome}</p>
                                <p className="mt-1 break-words"><span className="opacity-70">Técnico:</span> {c.tecnicos || "—"}</p>
                                <p className="break-words"><span className="opacity-70">Aux. Técnico:</span> {c.auxiliarTecnico || "—"}</p>
                                <p className="break-words"><span className="opacity-70">Nº do chip:</span> {c.numeroChip || "—"}</p>
                                <p className="break-words"><span className="opacity-70">Região:</span> {c.regiao || "—"}</p>
                              </button>
                            );
                          }
                          const ev = item.ev;
                          const f = FAIXA[ev.turno];
                          const meta = TURNO_META[ev.turno];
                          const classe = ev.cobrado ? meta.classe : NAO_COBRADO_CLASSE;
                          return (
                            <button key={ev.id} type="button" onClick={() => setSelecionado(ev.card)} className={`block w-full rounded-lg border px-2.5 py-2 text-left text-xs ring-1 ring-inset transition hover:brightness-95 ${classe}`}>
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="font-semibold">{hhmm(f.ini)} – {hhmm(f.fim)}</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-black/20"><span className={`h-1.5 w-1.5 rounded-full ${meta.ponto}`} />{meta.rotulo}</span>
                              </div>
                              <div className="mb-1">
                                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${ev.cobrado ? "bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/40" : "bg-rose-200 text-rose-800 ring-rose-400 dark:bg-rose-500/30 dark:text-rose-100 dark:ring-rose-500/50"}`}>{ev.cobrado ? "Cobrado" : "Não Cobrado"}</span>
                              </div>
                              <p className="break-words text-sm font-semibold leading-snug">{ev.cliente}</p>
                              <p className="mt-1 break-words"><span className="opacity-70">Técnico:</span> {ev.tecnico || "—"}</p>
                              <p className="break-words"><span className="opacity-70">Auxiliar:</span> {ev.auxiliar || "—"}</p>
                              <p className="break-words"><span className="opacity-70">Tipo:</span> {ev.tipoAtendimento || "—"}</p>
                              <p className="break-words"><span className="opacity-70">Setor:</span> {ev.setor || "—"}</p>
                              <p className="break-words"><span className="opacity-70">Região:</span> {ev.regiao || "—"}</p>
                              <p className="break-words"><span className="opacity-70">Agendado:</span> {ev.naoAgendado ? "Não" : "Sim"}</p>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selecionado && <DetalheCard card={selecionado} onFechar={() => setSelecionado(null)} />}
    </>
  );
}

function DetalheCard({ card, onFechar }: { card: Card; onFechar: () => void }) {
  const m = card.manutencao ?? {};
  const crit = criticidadeDoCard(card);
  const linha = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-sm dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{k}</span>
      <span className="text-right font-medium text-slate-800 dark:text-slate-100">{v}</span>
    </div>
  );
  return (
    <>
      <div onClick={onFechar} className="fixed inset-0 z-40 bg-slate-900/40" />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card bg-white p-5 shadow-xl scrollbar-hide dark:bg-slate-900">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <span className="font-mono text-xs text-slate-400">#{card.codigo} · {rotuloEtapa(card.etapa)}</span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{card.cliente.nome}</h2>
          </div>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">✕</button>
        </div>

        {/* Mapa da região (ponto vermelho) */}
        <MapaRegiao regiao={card.fluxo === "IMPLANTACAO" ? card.regiao : m.regiao} />

        {card.fluxo === "IMPLANTACAO" ? (
          <dl className="mt-4">
            {linha("Tipo de cliente", card.cliente.tipo ? TIPO_CLIENTE_META[card.cliente.tipo].rotulo : "—")}
            {linha("Criticidade", crit ? CRITICIDADE_META[crit].rotulo : "—")}
            {linha("Região", card.regiao ?? "—")}
            {linha("Período de execução", `${dataBR(card.dataInicioExecucao)} – ${dataBR(card.dataFimExecucao)}`)}
            {linha("Técnico", card.tecnicos ?? "—")}
            {linha("Aux. Técnico", card.auxiliarTecnico ?? "—")}
            {linha("Nº do chip", card.numeroChip ?? "—")}
            {linha("Valor total", formatarBRL(card.valores.total))}
            {card.observacoes && linha("Observações", card.observacoes)}
          </dl>
        ) : (
        <dl className="mt-4">
          {linha("Tipo de cliente", card.cliente.tipo ? TIPO_CLIENTE_META[card.cliente.tipo].rotulo : "—")}
          {linha("Criticidade", crit ? CRITICIDADE_META[crit].rotulo : "—")}
          {linha("Número da conta", card.numeroConta ?? "—")}
          {m.tipo !== "ORCAMENTO" && linha("Data da visita", dataBR(m.dataVisita))}
          {linha("Turno", m.turno ? (TURNO_ROTULO[m.turno] ?? m.turno) : "—")}
          {linha("Agendado", m.agendado ? "Sim" : "Não")}
          {m.tipo && linha("Tipo de entrada", m.tipo === "ORCAMENTO" ? "Orçamento" : "Visita")}
          {m.tipo === "ORCAMENTO" && linha("Período", `${dataBR(m.dataInicio)} – ${dataBR(m.dataFim)}`)}
          {m.tipo !== "ORCAMENTO" && linha("Visita cobrada", m.visitaCobrada ? "Sim" : "Não")}
          {m.visitaCobrada && m.tipo !== "ORCAMENTO" && linha("Valor da visita", formatarBRL(m.valorVisita))}
          {linha("Técnico", m.tecnico ?? "—")}
          {linha("Auxiliar técnico", m.auxiliarTecnico ?? "—")}
          {linha("Tipo de atendimento", m.tipoAtendimento ?? "—")}
          {linha("Setor", m.setor ?? "—")}
          {linha("Região", m.regiao ?? "—")}
          {linha("Ordem de serviço", m.ordemServico ?? "—")}
          {m.tipo !== "VISITA" && linha("Número do orçamento", card.numeroOrcamento ?? "—")}
          {m.tipo !== "VISITA" && linha("Valor do orçamento", formatarBRL(card.valores.total))}
          {linha("CR", card.cr ?? "—")}
          {linha("Chamado", card.medicao?.chamado ?? card.chamado ?? "—")}
          {card.datas?.conclusao && linha("Encerrado em", dataBR(card.datas.conclusao))}
          {card.observacoes && linha("Observações", card.observacoes)}
        </dl>
        )}
      </div>
    </>
  );
}
