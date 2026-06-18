"use client";

import { useEffect, useMemo, useState } from "react";
import { useCards } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { podeGerarRelatorio } from "@/lib/perfis";
import { formatarBRL } from "@/lib/flows";
import type { Card } from "@/types";

const PGTO: Record<string, string> = { A_VISTA: "À vista", PARCELADO: "Parcelado" };

function dataBR(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
}

export function RelatoriosView() {
  const { cards } = useCards();
  const { atual } = useAuth();
  const pode = podeGerarRelatorio(atual?.perfil);

  const [cardId, setCardId] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState<string>("");

  // Lê ?card= da URL (vindo do slide-over).
  useEffect(() => {
    setCardId(new URLSearchParams(window.location.search).get("card"));
  }, []);

  // Cards finalizados na coluna Medição.
  const finalizados = useMemo(
    () => cards.filter((c) => c.etapa === "MEDICAO" && c.status === "FINALIZADO"),
    [cards],
  );
  const competencias = useMemo(
    () => Array.from(new Set(finalizados.map((c) => c.medicao?.competencia).filter(Boolean) as string[])).sort(),
    [finalizados],
  );
  useEffect(() => {
    if (!competencia && competencias.length) setCompetencia(competencias[0]);
  }, [competencias, competencia]);

  const cardUnico = cardId ? cards.find((c) => c.id === cardId) : null;
  const daComp = finalizados.filter((c) => c.medicao?.competencia === competencia);
  const totalComp = daComp.reduce((s, c) => s + (c.medicao?.valorMedicao ?? 0), 0);

  if (!pode) {
    return (
      <div className="grid flex-1 place-items-center text-sm text-slate-400">
        Você não tem permissão para gerar relatórios.
      </div>
    );
  }

  return (
    <>
      <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Relatórios de Medição</h1>
          <p className="text-xs text-slate-400">{cardUnico ? "Relatório do card" : "Por competência"}</p>
        </div>
        <div className="flex items-center gap-2">
          {cardUnico ? (
            <button onClick={() => { setCardId(null); history.replaceState(null, "", "/relatorios"); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              ← Por competência
            </button>
          ) : (
            <select value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {competencias.length === 0 && <option value="">Sem competências</option>}
              {competencias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button onClick={() => window.print()} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
            Imprimir / PDF
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface-app p-6 scrollbar-hide dark:bg-slate-950">
        <div className="print-area mx-auto max-w-4xl rounded-card border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          {cardUnico ? <RelatorioCard card={cardUnico} /> : <RelatorioCompetencia competencia={competencia} cards={daComp} total={totalComp} />}
        </div>
      </div>
    </>
  );
}

function Cabecalho({ subtitulo }: { subtitulo: string }) {
  return (
    <div className="mb-4 border-b border-slate-200 pb-3 dark:border-slate-700">
      <p className="text-base font-bold text-brand-navy dark:text-white">GPSTec-POA — Segurança Eletrônica</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>
    </div>
  );
}

function RelatorioCompetencia({ competencia, cards, total }: { competencia: string; cards: Card[]; total: number }) {
  return (
    <>
      <Cabecalho subtitulo={`Relatório de Medição · Competência ${competencia || "—"} · ${cards.length} card(s)`} />
      {cards.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum card finalizado nesta competência.</p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <tr>
              <th className="py-1.5 pr-2 font-medium">Nº Impl.</th>
              <th className="py-1.5 pr-2 font-medium">Cliente</th>
              <th className="py-1.5 pr-2 font-medium">CR</th>
              <th className="py-1.5 pr-2 font-medium">Chamado</th>
              <th className="py-1.5 pr-2 font-medium">Abertura</th>
              <th className="py-1.5 pr-2 font-medium">Pgto</th>
              <th className="py-1.5 pr-2 font-medium">Parc.</th>
              <th className="py-1.5 pr-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {cards.map((c) => (
              <tr key={c.id} className="text-slate-700 dark:text-slate-200">
                <td className="py-1.5 pr-2">{c.medicao?.numeroImplantar ?? c.codigo}</td>
                <td className="py-1.5 pr-2">{c.cliente.nome}</td>
                <td className="py-1.5 pr-2">{c.cr ?? "—"}</td>
                <td className="py-1.5 pr-2">{c.medicao?.chamado ?? c.chamado ?? "—"}</td>
                <td className="py-1.5 pr-2">{dataBR(c.medicao?.dataAbertura)}</td>
                <td className="py-1.5 pr-2">{PGTO[c.medicao?.formaPagamento ?? ""] ?? "—"}</td>
                <td className="py-1.5 pr-2">{c.medicao?.parcelas ?? "—"}</td>
                <td className="py-1.5 pr-2 text-right font-medium">{formatarBRL(c.medicao?.valorMedicao)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 font-bold text-slate-900 dark:border-slate-600 dark:text-white">
              <td className="py-2" colSpan={7}>Total da competência</td>
              <td className="py-2 text-right">{formatarBRL(total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </>
  );
}

function RelatorioCard({ card }: { card: Card }) {
  const m = card.medicao ?? {};
  const linha = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{k}</span>
      <span className="font-medium text-slate-800 dark:text-slate-100">{v}</span>
    </div>
  );
  return (
    <>
      <Cabecalho subtitulo={`Relatório de Medição · Card #${card.codigo}`} />
      {linha("Nº Implantar", m.numeroImplantar ?? card.codigo)}
      {linha("Competência", m.competencia ?? "—")}
      {linha("Cliente", card.cliente.nome)}
      {linha("CR", card.cr ?? "—")}
      {linha("Chamado", m.chamado ?? card.chamado ?? "—")}
      {linha("Data de abertura", dataBR(m.dataAbertura))}
      {linha("Forma de pagamento", PGTO[m.formaPagamento ?? ""] ?? "—")}
      {linha("Parcelas", m.parcelas ?? "—")}
      {linha("Valor da medição", formatarBRL(m.valorMedicao))}
      {m.finalizadoPor && <p className="mt-3 text-[11px] text-slate-400">Finalizado por {m.finalizadoPor} em {dataBR(m.finalizadoEm)}.</p>}
    </>
  );
}
