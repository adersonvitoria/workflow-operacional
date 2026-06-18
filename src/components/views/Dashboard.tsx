"use client";

import { COLUNAS_IMPLANTACAO, formatarBRL, MODALIDADE_META } from "@/lib/flows";
import { useCards } from "@/lib/store";
import type { Card } from "@/types";

export function Dashboard() {
  const { porFluxo } = useCards();
  const imp = porFluxo("IMPLANTACAO");

  const ativos = imp.filter((c) => c.status !== "CONCLUIDO");
  const concluidos = imp.filter((c) => c.etapa === "MEDICAO");
  const aguardando = imp.filter((c) => c.status === "AGUARDANDO_APROVACAO");
  const pipeline = soma(ativos, (c) => c.valores.total);
  const mrr = soma(imp, (c) => c.valores.mensal);

  const porEtapa = COLUNAS_IMPLANTACAO.map((col) => ({
    titulo: col.titulo,
    accent: col.accent,
    qtd: imp.filter((c) => c.etapa === col.id).length,
  }));
  const maxEtapa = Math.max(1, ...porEtapa.map((e) => e.qtd));

  const locacao = imp.filter((c) => c.modalidade === "LOCACAO").length;
  const venda = imp.filter((c) => c.modalidade === "VENDA").length;
  const totalMod = Math.max(1, locacao + venda);

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        <p className="text-xs text-slate-400">Visão geral das implantações</p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto bg-surface-app p-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi rotulo="Projetos ativos" valor={String(ativos.length)} hint={`${imp.length} no total`} />
          <Kpi rotulo="Pipeline" valor={formatarBRL(pipeline)} hint="valor em aberto" />
          <Kpi rotulo="Receita mensal" valor={formatarBRL(mrr)} hint="MRR contratado" cor="text-emerald-600" />
          <Kpi rotulo="Aguardando aprovação" valor={String(aguardando.length)} hint="na Coordenação" cor={aguardando.length ? "text-amber-600" : undefined} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Distribuição por etapa */}
          <Painel titulo="Cards por etapa" className="lg:col-span-2">
            <ul className="space-y-2.5">
              {porEtapa.map((e) => (
                <li key={e.titulo} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-slate-600">{e.titulo}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${e.accent}`} style={{ width: `${(e.qtd / maxEtapa) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-sm font-semibold text-slate-700">{e.qtd}</span>
                </li>
              ))}
            </ul>
          </Painel>

          {/* Modalidade */}
          <Painel titulo="Por modalidade">
            <div className="space-y-4">
              <BarraModalidade rotulo={MODALIDADE_META.LOCACAO.rotulo} qtd={locacao} pct={(locacao / totalMod) * 100} cor="bg-emerald-500" />
              <BarraModalidade rotulo={MODALIDADE_META.VENDA.rotulo} qtd={venda} pct={(venda / totalMod) * 100} cor="bg-purple-500" />
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="text-slate-500">Concluídos (Medição)</span>
                <span className="font-semibold text-emerald-600">{concluidos.length}</span>
              </div>
            </div>
          </Painel>
        </div>

        {/* Fila de aprovação */}
        <Painel titulo={`Aguardando aprovação (${aguardando.length})`}>
          {aguardando.length === 0 ? (
            <p className="text-sm text-slate-400">Nada pendente de aprovação. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {aguardando.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.cliente.nome}</p>
                    <p className="text-xs text-slate-400">#{c.codigo} · CR {c.cr ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.modalidade && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${MODALIDADE_META[c.modalidade].classe}`}>
                        {MODALIDADE_META[c.modalidade].rotulo}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-slate-700">{formatarBRL(c.valores.total ?? c.valores.mensal)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>
    </>
  );
}

function soma(cards: Card[], get: (c: Card) => number | undefined): number {
  return cards.reduce((acc, c) => acc + (get(c) ?? 0), 0);
}

function Kpi({ rotulo, valor, hint, cor }: { rotulo: string; valor: string; hint?: string; cor?: string }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-medium text-slate-400">{rotulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor ?? "text-slate-900"}`}>{valor}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Painel({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-slate-200 bg-white p-5 shadow-card ${className ?? ""}`}>
      <h2 className="mb-4 text-sm font-semibold text-slate-800">{titulo}</h2>
      {children}
    </section>
  );
}

function BarraModalidade({ rotulo, qtd, pct, cor }: { rotulo: string; qtd: number; pct: number; cor: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{rotulo}</span>
        <span className="font-semibold text-slate-700">{qtd}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
