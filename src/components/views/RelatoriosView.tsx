"use client";

import { useEffect, useMemo, useState } from "react";
import { useCards } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { podeGerarRelatorio } from "@/lib/perfis";
import { competenciaDoCard, crsDoCard, ehVisitaIsenta, formatarBRL, origemValorDoCard, STATUS_META, valorDoCard, valoresPorCr, valorVisitaDoCard } from "@/lib/flows";
import { rotuloEtapa } from "@/lib/routing";
import type { Card, Fluxo } from "@/types";

const PGTO: Record<string, string> = { A_VISTA: "À vista", PARCELADO: "Parcelado" };
const FLUXO_ROTULO: Record<Fluxo, string> = { IMPLANTACAO: "Implantação", MANUTENCAO: "Manutenção", COMPRAS: "Compras" };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function dataBR(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
}

/** "06/2026" -> "Junho/2026" */
function compLabel(comp: string): string {
  const m = comp.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return comp || "—";
  const i = parseInt(m[1], 10) - 1;
  return MESES[i] ? `${MESES[i]}/${m[2]}` : comp;
}
/** "06/2026" -> "2026-06" (chave de ordenação cronológica) */
function compChave(comp: string): string {
  const m = comp.match(/^(\d{2})\/(\d{4})$/);
  return m ? `${m[2]}-${m[1]}` : comp;
}

type Modo = "esteiras" | "medicao" | "cliente";

/**
 * Relatórios — TODOS por competência. A competência considerada é sempre a
 * informada na coluna Medição (`medicao.competencia`), nunca as datas de
 * abertura/conclusão.
 */
export function RelatoriosView() {
  const { cards } = useCards();
  const { atual } = useAuth();
  const pode = podeGerarRelatorio(atual?.perfil);

  const [cardId, setCardId] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>("esteiras");
  const [conta, setConta] = useState<string>("");

  // Competências disponíveis = as informadas na Medição (mais recentes primeiro).
  const competencias = useMemo(
    () => Array.from(new Set(cards.map(competenciaDoCard).filter(Boolean)))
      .sort((a, b) => (compChave(a) < compChave(b) ? 1 : -1)),
    [cards],
  );
  const [competencia, setCompetencia] = useState<string>("");
  // Inicializa: ?mes=YYYY-MM (vindo do dashboard) convertido, senão a mais recente.
  useEffect(() => {
    if (competencia || !competencias.length) return;
    const p = new URLSearchParams(window.location.search).get("mes");
    const conv = p && /^\d{4}-\d{2}$/.test(p) ? `${p.slice(5, 7)}/${p.slice(0, 4)}` : null;
    setCompetencia(conv && competencias.includes(conv) ? conv : competencias[0]);
  }, [competencias, competencia]);

  // Lê ?card= da URL (vindo do slide-over).
  useEffect(() => {
    setCardId(new URLSearchParams(window.location.search).get("card"));
  }, []);

  // Tudo filtrado pela competência informada na Medição.
  const daComp = useMemo(() => cards.filter((c) => competenciaDoCard(c) === competencia), [cards, competencia]);
  // OS encerradas sem competência de medição caem no mês do encerramento
  // (fallback em competenciaDoCard). O aviso cobre só as que também não têm
  // data de conclusão — essas seguem fora de qualquer competência.
  const encerradosSemComp = useMemo(
    () => cards.filter((c) => c.etapa === "ENCERRADOS" && !competenciaDoCard(c)).length,
    [cards],
  );
  const implComp = daComp.filter((c) => c.fluxo === "IMPLANTACAO");
  // Manutenção no relatório: somente as OS encerradas.
  const manutComp = daComp.filter((c) => c.fluxo === "MANUTENCAO" && c.etapa === "ENCERRADOS");

  // Modo Cliente (todos os serviços por número da conta).
  const contas = useMemo(() => Array.from(new Set(cards.map((c) => c.numeroConta).filter(Boolean) as string[])).sort(), [cards]);
  const resultadosCliente = useMemo(() => {
    const q = conta.trim().toLowerCase();
    if (!q) return [];
    return cards.filter((c) => (c.numeroConta ?? "").toLowerCase().includes(q));
  }, [cards, conta]);

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
            {cardUnico ? "Relatório do card" : modo === "esteiras" ? "Esteiras por competência (Implantação + Manutenção)" : modo === "cliente" ? "Serviços por cliente (número da conta)" : "Medição por competência"}
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
                {([["esteiras", "Esteiras"], ["cliente", "Por cliente"], ["medicao", "Medição"]] as [Modo, string][]).map(([m, rot]) => (
                  <button key={m} onClick={() => setModo(m)} className={["rounded-md px-3 py-1 font-medium transition", modo === m ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"].join(" ")}>
                    {rot}
                  </button>
                ))}
              </div>
              {modo === "cliente" ? (
                <>
                  <input list="contas-datalist" value={conta} onChange={(e) => setConta(e.target.value)} placeholder="Número da conta" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                  <datalist id="contas-datalist">{contas.map((c) => <option key={c} value={c} />)}</datalist>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400">Competência</span>
                  <select value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    {competencias.length === 0 && <option value="">Sem competências</option>}
                    {competencias.map((c) => <option key={c} value={c}>{compLabel(c)}</option>)}
                  </select>
                </div>
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
          {!cardUnico && modo !== "cliente" && encerradosSemComp > 0 && (
            <p className="no-print mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
              ⚠ {encerradosSemComp} card(s) encerrado(s) sem competência de medição e sem data de conclusão — não aparecem em nenhuma competência destes relatórios.
            </p>
          )}
          {cardUnico ? (
            <RelatorioCard card={cardUnico} />
          ) : modo === "esteiras" ? (
            <RelatorioEsteiras competencia={competencia} impl={implComp} manut={manutComp} />
          ) : modo === "cliente" ? (
            <RelatorioCliente conta={conta} cards={resultadosCliente} />
          ) : (
            <RelatorioCompetencia competencia={competencia} cards={daComp} />
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

interface ColunaTab {
  titulo: string;
  valor: (c: Card) => string;
  mono?: boolean;
  direita?: boolean;
}

/**
 * Tabela de relatório com FILTRO por coluna no cabeçalho: cada coluna ganha um
 * campo "Filtrar…" (contém, sem diferenciar maiúsculas); o subtotal é
 * recalculado com as linhas visíveis. A linha de filtros não sai na impressão.
 */
function TabelaFiltravel({ colunas, cards, rotuloTotal }: { colunas: ColunaTab[]; cards: Card[]; rotuloTotal: string }) {
  const [filtros, setFiltros] = useState<string[]>(() => colunas.map(() => ""));
  const visiveis = cards.filter((c) =>
    colunas.every((col, i) => {
      const f = filtros[i]?.trim().toLowerCase();
      return !f || col.valor(c).toLowerCase().includes(f);
    }),
  );
  const total = visiveis.reduce((s, c) => s + valorDoCard(c), 0);
  const filtrando = filtros.some((f) => f.trim());
  const setFiltro = (i: number, v: string) => setFiltros((prev) => prev.map((f, j) => (j === i ? v : f)));

  return (
    <table className="w-full text-left text-xs">
      <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <tr>
          {colunas.map((col) => (
            <th key={col.titulo} className={["py-1.5 pr-2 font-medium", col.direita ? "text-right" : ""].join(" ")}>{col.titulo}</th>
          ))}
        </tr>
        <tr className="no-print">
          {colunas.map((col, i) => (
            <th key={col.titulo} className="pb-1.5 pr-2 font-normal">
              <input
                value={filtros[i] ?? ""}
                onChange={(e) => setFiltro(i, e.target.value)}
                placeholder="Filtrar…"
                className="w-full min-w-0 rounded border border-slate-200 px-1.5 py-1 text-[11px] font-normal text-slate-700 placeholder:text-slate-300 focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-600"
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {visiveis.length === 0 && (
          <tr>
            <td className="py-2 text-slate-400" colSpan={colunas.length}>
              {filtrando ? "Nenhuma linha corresponde aos filtros." : "Nenhum card nesta competência."}
            </td>
          </tr>
        )}
        {visiveis.map((c) => (
          <tr key={c.id} className="text-slate-700 dark:text-slate-200">
            {colunas.map((col) => (
              <td key={col.titulo} className={["py-1.5 pr-2", col.mono ? "font-mono" : "", col.direita ? "text-right font-medium" : ""].join(" ")}>
                {col.valor(c)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-slate-300 font-bold text-slate-900 dark:border-slate-600 dark:text-white">
          <td className="py-2" colSpan={colunas.length - 1}>
            {rotuloTotal}
            {filtrando && <span className="font-normal text-slate-400"> · {visiveis.length} de {cards.length} linha(s) (filtro aplicado)</span>}
          </td>
          <td className="py-2 text-right">{formatarBRL(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

const COLUNAS_ESTEIRA: ColunaTab[] = [
  { titulo: "Código", valor: (c) => `#${c.codigo}`, mono: true },
  { titulo: "Cliente", valor: (c) => c.cliente.nome },
  { titulo: "CR", valor: (c) => crsDoCard(c) },
  { titulo: "Etapa", valor: (c) => rotuloEtapa(c.etapa) },
  { titulo: "Status", valor: (c) => STATUS_META[c.status].rotulo },
  { titulo: "Origem do valor", valor: (c) => origemValorDoCard(c) },
  { titulo: "Valor", valor: (c) => formatarBRL(valorDoCard(c)), direita: true },
];

function SecaoEsteira({ titulo, cards }: { titulo: string; cards: Card[] }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo} · {cards.length} card(s)</h3>
      <TabelaFiltravel colunas={COLUNAS_ESTEIRA} cards={cards} rotuloTotal={`Subtotal ${titulo}`} />
    </section>
  );
}

function RelatorioEsteiras({ competencia, impl, manut }: { competencia: string; impl: Card[]; manut: Card[] }) {
  const totImpl = impl.reduce((s, c) => s + valorDoCard(c), 0);
  const totManut = manut.reduce((s, c) => s + valorDoCard(c), 0);
  // Visitas cobradas da competência (recorte informativo — já compõem o total).
  const comVisita = manut.filter((c) => valorVisitaDoCard(c) > 0);
  const totVisitas = comVisita.reduce((s, c) => s + valorVisitaDoCard(c), 0);
  // Visitas NÃO cobradas: OS de visita (não Orçamento) feitas sem cobrança —
  // visita não marcada como cobrada ou encerrada como Visita Isenta.
  const naoCobradas = manut.filter(
    (c) => c.manutencao?.tipo !== "ORCAMENTO" && (!c.manutencao?.visitaCobrada || c.medicao?.visitaIsenta),
  );
  // Isentas: recorte das que foram dispensadas por um orçamento (receita zero).
  const isentas = manut.filter(ehVisitaIsenta);
  return (
    <>
      <Cabecalho subtitulo={`Resultados das esteiras · Competência ${compLabel(competencia)}`} />
      <div className="grid grid-cols-5 gap-3">
        <ResumoBox titulo="Implantação" qtd={impl.length} valor={totImpl} />
        <ResumoBox titulo="Manutenção (encerrados)" qtd={manut.length} valor={totManut} />
        <ResumoBox titulo="Visitas cobradas" qtd={comVisita.length} valor={totVisitas} />
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Visitas não cobradas</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">{naoCobradas.length}</p>
          <p className="text-[11px] text-slate-400">
            visita(s) no período{isentas.length ? ` · ${isentas.length} isenta(s)` : ""}
          </p>
        </div>
        <ResumoBox titulo="Total geral" qtd={impl.length + manut.length} valor={totImpl + totManut} destaque />
      </div>
      <SecaoEsteira titulo="Implantação" cards={impl} />
      <SecaoEsteira titulo="Manutenção · Encerrados" cards={manut} />
      <TotaisPorCr cards={[...impl, ...manut]} />
    </>
  );
}

/**
 * Totais por CR (Centro de Resultado) da competência: cada valor do card é
 * vinculado ao seu CR (Venda: serviço/material/mensalidade; Locação:
 * monitoramento/locação; Manutenção: CR da OS).
 */
function TotaisPorCr({ cards }: { cards: Card[] }) {
  const porCr = new Map<string, { qtd: Set<string>; valor: number }>();
  for (const c of cards) {
    for (const v of valoresPorCr(c)) {
      const atual = porCr.get(v.cr) ?? { qtd: new Set<string>(), valor: 0 };
      atual.qtd.add(c.id);
      atual.valor += v.valor;
      porCr.set(v.cr, atual);
    }
  }
  const linhas = Array.from(porCr.entries()).sort((a, b) => b[1].valor - a[1].valor);
  const total = linhas.reduce((s, [, v]) => s + v.valor, 0);
  if (!linhas.length) return null;
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Totais por CR (Centro de Resultado)</h3>
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <tr>
            <th className="py-1.5 pr-2 font-medium">CR</th>
            <th className="py-1.5 pr-2 font-medium">Cards</th>
            <th className="py-1.5 pr-2 text-right font-medium">Valor vinculado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {linhas.map(([cr, v]) => (
            <tr key={cr} className="text-slate-700 dark:text-slate-200">
              <td className="py-1.5 pr-2 font-medium">{cr}</td>
              <td className="py-1.5 pr-2">{v.qtd.size}</td>
              <td className="py-1.5 pr-2 text-right font-medium">{formatarBRL(v.valor)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 font-bold text-slate-900 dark:border-slate-600 dark:text-white">
            <td className="py-2" colSpan={2}>Total vinculado aos CRs</td>
            <td className="py-2 text-right">{formatarBRL(total)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-1 text-[11px] text-slate-400">
        Venda: serviço → CR de serviço, material → CR de material, mensalidade → CR de mensalidade. Locação: mensalidade → CR de monitoramento, locação → CR de locação. Demais cards: valor de referência no CR do card.
      </p>
    </section>
  );
}

const COLUNAS_CLIENTE: ColunaTab[] = [
  { titulo: "Código", valor: (c) => `#${c.codigo}`, mono: true },
  { titulo: "Esteira", valor: (c) => FLUXO_ROTULO[c.fluxo] },
  { titulo: "Cliente", valor: (c) => c.cliente.nome },
  { titulo: "CR", valor: (c) => crsDoCard(c) },
  { titulo: "Etapa", valor: (c) => rotuloEtapa(c.etapa) },
  { titulo: "Competência", valor: (c) => competenciaDoCard(c) || "—" },
  { titulo: "Status", valor: (c) => STATUS_META[c.status].rotulo },
  { titulo: "Valor", valor: (c) => formatarBRL(valorDoCard(c)), direita: true },
];

function RelatorioCliente({ conta, cards }: { conta: string; cards: Card[] }) {
  const cliente = cards[0]?.cliente.nome;
  return (
    <>
      <Cabecalho subtitulo={`Serviços por cliente · Conta ${conta.trim() || "—"}${cliente ? " · " + cliente : ""} · ${cards.length} serviço(s)`} />
      {!conta.trim() ? (
        <p className="text-sm text-slate-400">Informe o número da conta para consultar os serviços do cliente.</p>
      ) : cards.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum serviço encontrado para a conta “{conta.trim()}”.</p>
      ) : (
        <TabelaFiltravel colunas={COLUNAS_CLIENTE} cards={cards} rotuloTotal="Total" />
      )}
    </>
  );
}

const COLUNAS_MEDICAO: ColunaTab[] = [
  { titulo: "Código", valor: (c) => `#${c.codigo}`, mono: true },
  { titulo: "Esteira", valor: (c) => FLUXO_ROTULO[c.fluxo] },
  { titulo: "Cliente", valor: (c) => c.cliente.nome },
  { titulo: "CR", valor: (c) => crsDoCard(c) },
  { titulo: "Chamado", valor: (c) => c.medicao?.chamado ?? c.chamado ?? "—" },
  { titulo: "Conta", valor: (c) => c.numeroConta ?? "—" },
  { titulo: "Valor", valor: (c) => formatarBRL(valorDoCard(c)), direita: true },
];

function RelatorioCompetencia({ competencia, cards }: { competencia: string; cards: Card[] }) {
  return (
    <>
      <Cabecalho subtitulo={`Relatório de Medição · Competência ${compLabel(competencia)} · ${cards.length} card(s)`} />
      <TabelaFiltravel colunas={COLUNAS_MEDICAO} cards={cards} rotuloTotal="Total da competência" />
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
  const man = card.manutencao;
  return (
    <>
      <Cabecalho subtitulo={`Relatório de Medição · Card #${card.codigo}`} />
      {linha("Esteira", FLUXO_ROTULO[card.fluxo])}
      {linha("Nº Implantar", m.numeroImplantar ?? card.codigo)}
      {linha("Competência", compLabel(m.competencia ?? ""))}
      {linha("Cliente", card.cliente.nome)}
      {linha("CR", crsDoCard(card))}
      {linha("Chamado", m.chamado ?? card.chamado ?? "—")}
      {man?.tipo && linha("Tipo de entrada", man.tipo === "ORCAMENTO" ? "Orçamento" : "Visita")}
      {card.numeroOrcamento && linha("Nº do orçamento", card.numeroOrcamento)}
      {card.valores.total != null && linha("Valor do orçamento", formatarBRL(card.valores.total))}
      {man?.visitaCobrada && linha("Visita cobrada", formatarBRL(man.valorVisita))}
      {m.visitaIsenta && linha("Visita Isenta", "Sim")}
      {linha("Data de abertura", dataBR(m.dataAbertura))}
      {linha("Forma de pagamento", PGTO[m.formaPagamento ?? ""] ?? "—")}
      {linha("Parcelas", m.parcelas ?? "—")}
      {linha("Valor da medição", formatarBRL(m.valorMedicao))}
      {/* Rateio da medição: uma linha por Valor / Chamado / CR. */}
      {(m.lancamentos ?? []).length > 1 &&
        (m.lancamentos ?? []).map((l, i) => (
          <div key={l.id ?? i} className="flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">
              Linha {i + 1}{l.chamado ? ` · chamado ${l.chamado}` : ""}{l.cr ? ` · CR ${l.cr}` : ""}
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-100">{formatarBRL(l.valor)}</span>
          </div>
        ))}
      {linha("Valor considerado nos relatórios", `${formatarBRL(valorDoCard(card))} (${origemValorDoCard(card)})`)}
      {valoresPorCr(card).length > 1 &&
        valoresPorCr(card).map((v, i) => (
          <div key={`${v.cr}-${i}`} className="flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">CR {v.cr} · {v.origem}</span>
            <span className="font-medium text-slate-800 dark:text-slate-100">{formatarBRL(v.valor)}</span>
          </div>
        ))}
      {m.finalizadoPor && <p className="mt-3 text-[11px] text-slate-400">Finalizado por {m.finalizadoPor} em {dataBR(m.finalizadoEm)}.</p>}
    </>
  );
}
