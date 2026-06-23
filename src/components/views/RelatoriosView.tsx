"use client";

import { useEffect, useMemo, useState } from "react";
import { useCards } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { podeGerarRelatorio } from "@/lib/perfis";
import { formatarBRL, STATUS_META } from "@/lib/flows";
import { rotuloEtapa } from "@/lib/routing";
import type { Card } from "@/types";

const PGTO: Record<string, string> = { A_VISTA: "À vista", PARCELADO: "Parcelado" };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function dataBR(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
}

/** Mês de referência do card (YYYY-MM) — conclusão quando houver, senão abertura. */
function mesDoCard(c: Card): string {
  const iso = c.datas?.conclusao ?? c.datas?.abertura;
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Valor do card: medição (faturado) > total > mensal. */
function valorDoCard(c: Card): number {
  return c.medicao?.valorMedicao ?? c.valores?.total ?? c.valores?.mensal ?? 0;
}

function mesLabel(mes: string): string {
  const [a, m] = mes.split("-");
  const i = parseInt(m, 10) - 1;
  return MESES[i] ? `${MESES[i]}/${a}` : mes || "—";
}

type Modo = "esteiras" | "medicao";

export function RelatoriosView() {
  const { cards } = useCards();
  const { atual } = useAuth();
  const pode = podeGerarRelatorio(atual?.perfil);

  const [cardId, setCardId] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>("esteiras");
  const [competencia, setCompetencia] = useState<string>("");
  const [mesRef, setMesRef] = useState<string>(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
  });

  // Lê ?card= da URL (vindo do slide-over).
  useEffect(() => {
    setCardId(new URLSearchParams(window.location.search).get("card"));
  }, []);

  // --- Modo Medição (cards finalizados por competência) ---
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

  const daComp = finalizados.filter((c) => c.medicao?.competencia === competencia);
  const totalComp = daComp.reduce((s, c) => s + (c.medicao?.valorMedicao ?? 0), 0);

  // --- Modo Esteiras (Implantação + Manutenção por mês) ---
  const noMes = useMemo(() => cards.filter((c) => mesDoCard(c) === mesRef), [cards, mesRef]);
  const implMes = noMes.filter((c) => c.fluxo === "IMPLANTACAO");
  const manutMes = noMes.filter((c) => c.fluxo === "MANUTENCAO");

  const cardUnico = cardId ? cards.find((c) => c.id === cardId) : null;

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
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Relatórios</h1>
          <p className="text-xs text-slate-400">
            {cardUnico ? "Relatório do card" : modo === "esteiras" ? "Esteiras por mês (Implantação + Manutenção)" : "Medição por competência"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cardUnico ? (
            <button onClick={() => { setCardId(null); history.replaceState(null, "", "/relatorios"); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              ← Voltar
            </button>
          ) : (
            <>
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-sm dark:border-slate-700">
                {([["esteiras", "Esteiras (mês)"], ["medicao", "Medição (competência)"]] as [Modo, string][]).map(([m, rot]) => (
                  <button key={m} onClick={() => setModo(m)} className={["rounded-md px-3 py-1 font-medium transition", modo === m ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"].join(" ")}>
                    {rot}
                  </button>
                ))}
              </div>
              {modo === "esteiras" ? (
                <input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              ) : (
                <select value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  {competencias.length === 0 && <option value="">Sem competências</option>}
                  {competencias.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </>
          )}
          <button onClick={() => window.print()} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
            Imprimir / PDF
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface-app p-6 scrollbar-hide dark:bg-slate-950">
        <div className="print-area mx-auto max-w-4xl rounded-card border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          {cardUnico ? (
            <RelatorioCard card={cardUnico} />
          ) : modo === "esteiras" ? (
            <RelatorioEsteiras mes={mesRef} impl={implMes} manut={manutMes} />
          ) : (
            <RelatorioCompetencia competencia={competencia} cards={daComp} total={totalComp} />
          )}
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

function ResumoBox({ titulo, qtd, valor, destaque }: { titulo: string; qtd: number; valor: number; destaque?: boolean }) {
  return (
    <div className={["rounded-lg border p-3", destaque ? "border-brand/40 bg-brand/5" : "border-slate-200 dark:border-slate-700"].join(" ")}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{titulo}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">{formatarBRL(valor)}</p>
      <p className="text-[11px] text-slate-400">{qtd} card(s)</p>
    </div>
  );
}

function SecaoEsteira({ titulo, cards, total }: { titulo: string; cards: Card[]; total: number }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo} · {cards.length} card(s)</h3>
      {cards.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum card neste mês.</p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <tr>
              <th className="py-1.5 pr-2 font-medium">Código</th>
              <th className="py-1.5 pr-2 font-medium">Cliente</th>
              <th className="py-1.5 pr-2 font-medium">Etapa</th>
              <th className="py-1.5 pr-2 font-medium">Status</th>
              <th className="py-1.5 pr-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {cards.map((c) => (
              <tr key={c.id} className="text-slate-700 dark:text-slate-200">
                <td className="py-1.5 pr-2 font-mono">#{c.codigo}</td>
                <td className="py-1.5 pr-2">{c.cliente.nome}</td>
                <td className="py-1.5 pr-2">{rotuloEtapa(c.etapa)}</td>
                <td className="py-1.5 pr-2">{STATUS_META[c.status].rotulo}</td>
                <td className="py-1.5 pr-2 text-right font-medium">{formatarBRL(valorDoCard(c))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 font-bold text-slate-900 dark:border-slate-600 dark:text-white">
              <td className="py-2" colSpan={4}>Subtotal {titulo}</td>
              <td className="py-2 text-right">{formatarBRL(total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}

function RelatorioEsteiras({ mes, impl, manut }: { mes: string; impl: Card[]; manut: Card[] }) {
  const totImpl = impl.reduce((s, c) => s + valorDoCard(c), 0);
  const totManut = manut.reduce((s, c) => s + valorDoCard(c), 0);
  return (
    <>
      <Cabecalho subtitulo={`Resultados das esteiras · Competência ${mesLabel(mes)}`} />
      <div className="grid grid-cols-3 gap-3">
        <ResumoBox titulo="Implantação" qtd={impl.length} valor={totImpl} />
        <ResumoBox titulo="Manutenção" qtd={manut.length} valor={totManut} />
        <ResumoBox titulo="Total geral" qtd={impl.length + manut.length} valor={totImpl + totManut} destaque />
      </div>
      <SecaoEsteira titulo="Implantação" cards={impl} total={totImpl} />
      <SecaoEsteira titulo="Manutenção" cards={manut} total={totManut} />
    </>
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
