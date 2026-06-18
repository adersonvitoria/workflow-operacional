"use client";

import { useState } from "react";
import Link from "next/link";
import { cardParado, COLUNAS_IMPLANTACAO, formatarBRL, MODALIDADE_META } from "@/lib/flows";
import { useCards } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { PERFIL_META, podeExecutarEtapa } from "@/lib/perfis";
import { rotuloEtapa } from "@/lib/routing";
import type { Card } from "@/types";

const encerrado = (s: Card["status"]) => s === "CONCLUIDO" || s === "FINALIZADO";
const soma = (cs: Card[], get: (c: Card) => number | undefined) => cs.reduce((a, c) => a + (get(c) ?? 0), 0);

export function Dashboard() {
  const { porFluxo } = useCards();
  const { atual } = useAuth();
  const perfil = atual?.perfil;
  const imp = porFluxo("IMPLANTACAO");

  const pendencias = imp.filter((c) => !encerrado(c.status) && podeExecutarEtapa(perfil, c.etapa, c.modalidade));

  const ehGestao = perfil === "COORDENADOR" || perfil === "ADMINISTRATIVO";
  const ehComercial = perfil === "COMERCIAL";
  const ehMedicao = perfil === "MEDICAO";
  const ehOperacional = !ehGestao && !ehComercial && !ehMedicao;

  const subtitulo = perfil ? PERFIL_META[perfil].rotulo : "";

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-xs text-slate-400">Olá, {atual?.nome} · visão de {subtitulo}</p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto bg-surface-app p-6 scrollbar-hide dark:bg-slate-950">
        {/* Minhas pendências — para quem atua em etapas */}
        {(ehOperacional || ehMedicao || perfil === "COORDENADOR" || ehComercial) && (
          <Painel titulo={`Minhas pendências (${pendencias.length})`}>
            {pendencias.length === 0 ? (
              <p className="text-sm text-slate-400">Nada aguardando sua ação no momento. 🎉</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendencias.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.cliente.nome}</p>
                      <p className="text-xs text-slate-400">#{c.codigo} · {rotuloEtapa(c.etapa)}{c.cr ? ` · CR ${c.cr}` : ""}{cardParado(c) ? " · ⏱ +96h" : ""}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {c.modalidade && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${MODALIDADE_META[c.modalidade].classe}`}>{MODALIDADE_META[c.modalidade].rotulo}</span>}
                      <Link href={`/implantacoes?card=${c.id}`} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Abrir →</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Painel>
        )}

        {ehGestao && <Gestao imp={imp} />}
        {ehComercial && <Comercial imp={imp} />}
        {ehMedicao && <Medicao imp={imp} />}
        {ehOperacional && <Operacional pendencias={pendencias} />}
      </div>
    </>
  );
}

// --- Visões por perfil -----------------------------------------------------

function Gestao({ imp }: { imp: Card[] }) {
  const ativos = imp.filter((c) => !encerrado(c.status));
  const aguardando = imp.filter((c) => c.status === "AGUARDANDO_APROVACAO");
  const porEtapa = COLUNAS_IMPLANTACAO.map((col) => ({ titulo: col.titulo, accent: col.accent, qtd: imp.filter((c) => c.etapa === col.id).length }));
  const maxEtapa = Math.max(1, ...porEtapa.map((e) => e.qtd));
  const locacao = imp.filter((c) => c.modalidade === "LOCACAO").length;
  const venda = imp.filter((c) => c.modalidade === "VENDA").length;
  const totalMod = Math.max(1, locacao + venda);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi rotulo="Projetos ativos" valor={String(ativos.length)} hint={`${imp.length} no total`} />
        <Kpi rotulo="Pipeline" valor={formatarBRL(soma(ativos, (c) => c.valores.total))} hint="valor em aberto" />
        <Kpi rotulo="Receita mensal" valor={formatarBRL(soma(imp, (c) => c.valores.mensal))} hint="MRR contratado" cor="text-emerald-600 dark:text-emerald-400" />
        <Kpi rotulo="Aguardando aprovação" valor={String(aguardando.length)} hint="na Coordenação" cor={aguardando.length ? "text-amber-600 dark:text-amber-400" : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Painel titulo="Cards por etapa" className="lg:col-span-2">
          {porEtapa.map((e) => <Barra key={e.titulo} rotulo={e.titulo} qtd={e.qtd} pct={(e.qtd / maxEtapa) * 100} cor={e.accent} largo />)}
        </Painel>
        <Painel titulo="Por modalidade">
          <Barra rotulo="Locação" qtd={locacao} pct={(locacao / totalMod) * 100} cor="bg-emerald-500" />
          <Barra rotulo="Venda" qtd={venda} pct={(venda / totalMod) * 100} cor="bg-purple-500" />
        </Painel>
      </div>

      <AnaliseIA />
    </>
  );
}

function AnaliseIA() {
  const [analise, setAnalise] = useState<string | null>(null);
  const [fonte, setFonte] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function analisar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/analise", { method: "POST", credentials: "same-origin" });
      const json = await res.json();
      setAnalise(json.analise ?? "Não foi possível gerar a análise.");
      setFonte(json.fonte ?? null);
    } catch {
      setAnalise("Falha ao gerar a análise.");
    }
    setCarregando(false);
  }

  return (
    <section className="rounded-card border border-brand/30 bg-brand/5 p-5 shadow-card dark:border-brand/40 dark:bg-brand/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">🤖 Análise da Coordenação (IA)</h2>
        <button onClick={analisar} disabled={carregando} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {carregando ? "Analisando…" : analise ? "Reanalisar" : "Analisar problemas"}
        </button>
      </div>
      {analise ? (
        <>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">{analise}</p>
          {fonte === "heuristica" && <p className="mt-2 text-[11px] text-slate-400">Análise baseada em regras (defina ANTHROPIC_API_KEY para usar a IA da Claude).</p>}
        </>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">Gere uma análise dos cards parados (SLA) e pendentes de aprovação, com as ações recomendadas.</p>
      )}
    </section>
  );
}

function Comercial({ imp }: { imp: Card[] }) {
  const ativos = imp.filter((c) => !encerrado(c.status));
  const locacao = imp.filter((c) => c.modalidade === "LOCACAO").length;
  const venda = imp.filter((c) => c.modalidade === "VENDA").length;
  const totalMod = Math.max(1, locacao + venda);
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi rotulo="Projetos ativos" valor={String(ativos.length)} hint={`${imp.length} cadastrados`} />
        <Kpi rotulo="Pipeline" valor={formatarBRL(soma(ativos, (c) => c.valores.total))} hint="em aberto" />
        <Kpi rotulo="Receita mensal" valor={formatarBRL(soma(imp, (c) => c.valores.mensal))} hint="MRR contratado" cor="text-emerald-600 dark:text-emerald-400" />
        <Kpi rotulo="Vendas / Locações" valor={`${venda} / ${locacao}`} hint="por modalidade" />
      </div>
      <Painel titulo="Por modalidade">
        <Barra rotulo="Locação" qtd={locacao} pct={(locacao / totalMod) * 100} cor="bg-emerald-500" />
        <Barra rotulo="Venda" qtd={venda} pct={(venda / totalMod) * 100} cor="bg-purple-500" />
      </Painel>
    </>
  );
}

function Medicao({ imp }: { imp: Card[] }) {
  const naColuna = imp.filter((c) => c.etapa === "MEDICAO");
  const aMedir = naColuna.filter((c) => c.status !== "FINALIZADO");
  const finalizados = naColuna.filter((c) => c.status === "FINALIZADO");
  const faturado = soma(finalizados, (c) => c.medicao?.valorMedicao);

  const porComp = new Map<string, number>();
  for (const c of finalizados) {
    const k = c.medicao?.competencia ?? "—";
    porComp.set(k, (porComp.get(k) ?? 0) + (c.medicao?.valorMedicao ?? 0));
  }
  const comps = [...porComp.entries()].sort();
  const maxComp = Math.max(1, ...comps.map(([, v]) => v));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi rotulo="A medir" valor={String(aMedir.length)} hint="na coluna Medição" cor={aMedir.length ? "text-amber-600 dark:text-amber-400" : undefined} />
        <Kpi rotulo="Finalizados" valor={String(finalizados.length)} hint="medições concluídas" />
        <Kpi rotulo="Faturado" valor={formatarBRL(faturado)} hint="total finalizado" cor="text-emerald-600 dark:text-emerald-400" />
        <Kpi rotulo="Competências" valor={String(comps.length)} hint="com faturamento" />
      </div>
      <Painel titulo="Faturamento por competência">
        {comps.length === 0 ? <p className="text-sm text-slate-400">Nenhuma medição finalizada ainda.</p> :
          comps.map(([k, v]) => <Barra key={k} rotulo={k} qtd={formatarBRL(v)} pct={(v / maxComp) * 100} cor="bg-emerald-600" largo />)}
      </Painel>
    </>
  );
}

function Operacional({ pendencias }: { pendencias: Card[] }) {
  const urgentes = pendencias.filter((c) => c.prioridade === "URGENTE").length;
  const parados = pendencias.filter((c) => cardParado(c)).length;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <Kpi rotulo="Aguardando sua ação" valor={String(pendencias.length)} hint="cards na sua fila" />
      <Kpi rotulo="Urgentes" valor={String(urgentes)} hint="prioridade urgente" cor={urgentes ? "text-rose-600 dark:text-rose-400" : undefined} />
      <Kpi rotulo="Parados +96h" valor={String(parados)} hint="atrasados na coluna" cor={parados ? "text-rose-600 dark:text-rose-400" : undefined} />
    </div>
  );
}

// --- UI helpers ------------------------------------------------------------

function Kpi({ rotulo, valor, hint, cor }: { rotulo: string; valor: string; hint?: string; cor?: string }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-400">{rotulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor ?? "text-slate-900 dark:text-white"}`}>{valor}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Painel({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 ${className ?? ""}`}>
      <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{titulo}</h2>
      {children}
    </section>
  );
}

function Barra({ rotulo, qtd, pct, cor, largo }: { rotulo: string; qtd: number | string; pct: number; cor: string; largo?: boolean }) {
  return (
    <div className={largo ? "mb-2.5 flex items-center gap-3 last:mb-0" : "mb-4 last:mb-0"}>
      {largo ? (
        <>
          <span className="w-44 shrink-0 truncate text-sm text-slate-600 dark:text-slate-300">{rotulo}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="w-20 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{qtd}</span>
        </>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">{rotulo}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{qtd}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
