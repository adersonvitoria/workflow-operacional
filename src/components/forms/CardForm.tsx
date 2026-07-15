"use client";

import { useEffect, useState } from "react";
import { CRITICIDADE_META, formatarBRL, MODALIDADE_META, TIPO_CLIENTE_META } from "@/lib/flows";
import { useCatalogo } from "@/lib/catalogo-store";
import { useTecnicos } from "@/lib/tecnicos-store";
import { REGIOES_POA } from "@/lib/regioes-poa";
import { ComboPessoa } from "@/components/forms/ComboPessoa";
import type { NovoCardInput } from "@/lib/store";
import type { Card, DadosManutencao, Fluxo, ItemMaterial, Modalidade, Prioridade, TipoCliente, TipoEntradaManutencao, Turno } from "@/types";

interface CardFormProps {
  aberto: boolean;
  fluxo: Fluxo;
  /** Quando presente, o formulário entra em modo edição. */
  inicial?: Card | null;
  onFechar: () => void;
  onSubmit: (values: NovoCardInput) => void;
}

/** Data de hoje em YYYY-MM-DD (horário local). */
function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const VAZIO = (fluxo: Fluxo): NovoCardInput => ({
  fluxo,
  clienteNome: "",
  prioridade: "NORMAL",
});

const PRIORIDADES: Prioridade[] = ["BAIXA", "NORMAL", "ALTA", "URGENTE"];

/** Tipo da entrada de Manutenção (estilo Modalidade): Orçamento x Visita. */
const TIPO_ENTRADA_META: Record<TipoEntradaManutencao, { rotulo: string; classe: string }> = {
  ORCAMENTO: { rotulo: "Orçamento", classe: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30" },
  VISITA: { rotulo: "Visita", classe: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/30" },
};

/** Modal de cadastro/edição de card. */
export function CardForm({ aberto, fluxo, inicial, onFechar, onSubmit }: CardFormProps) {
  const { ativos } = useCatalogo();
  const { ativos: tecnicosAtivos } = useTecnicos();
  const [form, setForm] = useState<NovoCardInput>(VAZIO(fluxo));
  const [itens, setItens] = useState<ItemMaterial[]>([]);
  const [itemSel, setItemSel] = useState<string>("");
  const [qtdSel, setQtdSel] = useState<string>("1");
  const [erro, setErro] = useState<string | null>(null);
  const edicao = !!inicial;

  // Valores derivados. Venda: o material sai dos itens com a margem aplicada;
  // Locação: equipamentos é digitado à mão (sem seção de itens).
  const itemsCusto = itens.reduce((s, m) => s + (m.precoUnitario ?? 0) * m.quantidade, 0);
  const margem = form.margem ?? 0;
  const materialVenda = itemsCusto * (1 + margem / 100);
  const totalVenda = (form.maoDeObra ?? 0) + materialVenda;
  // Locação: equipamentos = soma dos itens (sem margem).
  const totalLocacao = (form.maoDeObra ?? 0) + itemsCusto;

  // Seleciona o primeiro item do catálogo assim que ele carrega.
  useEffect(() => {
    if (!itemSel && ativos.length) setItemSel(ativos[0].id);
  }, [ativos, itemSel]);

  useEffect(() => {
    if (!aberto) return;
    if (inicial) {
      setForm({
        fluxo: inicial.fluxo,
        clienteNome: inicial.cliente.nome,
        documento: inicial.cliente.documento,
        contato: inicial.cliente.contato,
        endereco: inicial.cliente.endereco,
        tipoCliente: inicial.cliente.tipo,
        modalidade: inicial.modalidade,
        prioridade: inicial.prioridade,
        cr: inicial.cr,
        cc: inicial.cc,
        crMonitoramento: inicial.crMonitoramento,
        crLocacao: inicial.crLocacao,
        crServico: inicial.crServico,
        crMaterial: inicial.crMaterial,
        crMensalidade: inicial.crMensalidade,
        margem: inicial.margemVenda,
        // Perguntas básicas: marca a caixinha se já houver flag ou valor.
        temContrato: inicial.temContrato ?? !!inicial.chamado,
        crDedicado: inicial.crDedicado ?? !!inicial.cr,
        temInvestimento: inicial.temInvestimento ?? !!inicial.chamadoInvestimento,
        chamadoInvestimento: inicial.chamadoInvestimento,
        chamado: inicial.chamado,
        numeroConta: inicial.numeroConta,
        regiao: inicial.regiao,
        dataCadastro: inicial.datas?.abertura?.slice(0, 10),
        maoDeObra: inicial.valores.maoDeObra,
        equipamentos: inicial.valores.equipamentos,
        total: inicial.valores.total,
        mensal: inicial.valores.mensal,
        locacao: inicial.valores.locacao,
        numeroOrcamento: inicial.numeroOrcamento,
        manutencao: inicial.manutencao,
        observacoes: inicial.observacoes,
      });
    } else {
      setForm({ ...VAZIO(fluxo), dataCadastro: hojeISO() });
    }
    setItens(inicial?.materiais ?? []);
    setQtdSel("1");
    setErro(null);
  }, [aberto, inicial, fluxo]);

  if (!aberto) return null;

  function set<K extends keyof NovoCardInput>(k: K, v: NovoCardInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function num(v: string): number | undefined {
    if (v.trim() === "") return undefined;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }

  // Dados específicos de Manutenção (objeto aninhado no card).
  const man = form.manutencao ?? {};
  function setM<K extends keyof DadosManutencao>(k: K, v: DadosManutencao[K]) {
    setForm((f) => ({ ...f, manutencao: { ...(f.manutencao ?? {}), [k]: v } }));
  }

  function addItem() {
    const q = parseInt(qtdSel, 10);
    const item = ativos.find((i) => i.id === itemSel);
    if (!item || !Number.isFinite(q) || q < 1) return;
    const natureza = form.modalidade === "VENDA" ? "INVESTIMENTO" : "ESTOQUE";
    setItens((prev) => [
      ...prev,
      { id: `m-${prev.length}-${Date.now()}`, descricao: item.descricao, quantidade: q, natureza, statusAlmox: "PENDENTE", precoUnitario: item.preco },
    ]);
    setQtdSel("1");
  }
  function removeItem(id: string) {
    setItens((prev) => prev.filter((m) => m.id !== id));
  }

  function submeter() {
    if (!form.clienteNome.trim()) return setErro("Informe o nome do cliente.");
    if (fluxo === "IMPLANTACAO") {
      if (!form.modalidade) return setErro("Selecione a modalidade (Locação ou Venda).");
      if (form.modalidade === "VENDA") {
        if (!totalVenda) return setErro("Adicione itens e/ou informe o valor de serviço.");
        onSubmit({ ...form, equipamentos: materialVenda, total: totalVenda, materiais: itens });
        return;
      }
      // Locação: equipamentos = soma dos itens; mensalidade/locação recorrentes.
      if (!totalLocacao && !form.mensal && !form.locacao) {
        return setErro("Informe a mensalidade, a locação ou os valores de implantação.");
      }
      onSubmit({ ...form, equipamentos: itemsCusto, total: totalLocacao, materiais: itens });
      return;
    }
    // Manutenção: sem valores/itens — só os campos da entrada.
    onSubmit({ ...form });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onFechar} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-card bg-white shadow-xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {edicao ? `Editar #${inicial?.codigo}` : fluxo === "MANUTENCAO" ? "Nova entrada de Manutenção" : "Nova entrada comercial"}
          </h2>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">✕</button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4 scrollbar-hide">
          <Campo label="Cliente *">
            <input value={form.clienteNome} onChange={(e) => set("clienteNome", e.target.value)} className={inputCls} placeholder="Razão social / nome" />
          </Campo>

          <Campo label="Data de cadastro">
            <input readOnly value={form.dataCadastro ? form.dataCadastro.split("-").reverse().join("/") : ""} className={`${inputCls} cursor-default bg-slate-50 text-slate-500 dark:bg-slate-800/60`} title="Preenchida automaticamente" />
            <span className="mt-0.5 block text-[10px] text-slate-400">Preenchida automaticamente — não editável.</span>
          </Campo>

          {fluxo === "MANUTENCAO" && (
            <Campo label="Tipo de cliente">
              <div className="flex gap-2">
                {(["CORPORATIVO", "COMERCIAL", "VAREJO"] as TipoCliente[]).map((t) => {
                  const ativo = form.tipoCliente === t;
                  const crit = TIPO_CLIENTE_META[t].criticidade;
                  return (
                    <button key={t} type="button" onClick={() => set("tipoCliente", ativo ? undefined : t)}
                      className={["flex-1 rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-inset transition", ativo ? CRITICIDADE_META[crit].classe : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"].join(" ")}>
                      {TIPO_CLIENTE_META[t].rotulo}
                    </button>
                  );
                })}
              </div>
              {form.tipoCliente && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Criticidade: <span className="font-semibold text-slate-500 dark:text-slate-300">{CRITICIDADE_META[TIPO_CLIENTE_META[form.tipoCliente].criticidade].rotulo}</span>
                </p>
              )}
            </Campo>
          )}

          {fluxo === "IMPLANTACAO" && (
            <Campo label="Modalidade *">
              <div className="flex gap-2">
                {(["LOCACAO", "VENDA"] as Modalidade[]).map((m) => (
                  <button key={m} type="button" onClick={() => set("modalidade", m)}
                    className={["flex-1 rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-inset transition", form.modalidade === m ? MODALIDADE_META[m].classe : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"].join(" ")}>
                    {MODALIDADE_META[m].rotulo}
                  </button>
                ))}
              </div>
            </Campo>
          )}

          {/* Implantação: os campos abrem conforme a modalidade escolhida. */}
          {fluxo === "IMPLANTACAO" && !form.modalidade && (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Selecione a modalidade acima para abrir os campos do cadastro.
            </p>
          )}

          {/* Implantação: tipo de cliente + região (iguais aos da Manutenção). */}
          {fluxo === "IMPLANTACAO" && form.modalidade && (
            <>
              <Campo label="Tipo de cliente">
                <div className="flex gap-2">
                  {(["CORPORATIVO", "COMERCIAL", "VAREJO"] as TipoCliente[]).map((t) => {
                    const ativo = form.tipoCliente === t;
                    const crit = TIPO_CLIENTE_META[t].criticidade;
                    return (
                      <button key={t} type="button" onClick={() => set("tipoCliente", ativo ? undefined : t)}
                        className={["flex-1 rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-inset transition", ativo ? CRITICIDADE_META[crit].classe : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"].join(" ")}>
                        {TIPO_CLIENTE_META[t].rotulo}
                      </button>
                    );
                  })}
                </div>
                {form.tipoCliente && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Criticidade: <span className="font-semibold text-slate-500 dark:text-slate-300">{CRITICIDADE_META[TIPO_CLIENTE_META[form.tipoCliente].criticidade].rotulo}</span>
                  </p>
                )}
              </Campo>

              <Campo label="Região (POA, metropolitana e bairros)">
                <input list="regioes-poa-datalist" value={form.regiao ?? ""} onChange={(e) => set("regiao", e.target.value)} className={inputCls} placeholder="Selecione ou pesquise" />
                <datalist id="regioes-poa-datalist">{REGIOES_POA.map((c) => <option key={c} value={c} />)}</datalist>
              </Campo>

              {/* Perguntas básicas (comuns a Locação e Venda): marcar abre o campo. */}
              <div className="space-y-2">
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">Perguntas básicas</span>

                <div className="flex items-center gap-3">
                  <label className="flex w-40 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={!!form.temContrato} onChange={(e) => { const v = e.target.checked; set("temContrato", v); if (!v) set("chamado", undefined); }} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
                    Contrato?
                  </label>
                  {form.temContrato && <input value={form.chamado ?? ""} onChange={(e) => set("chamado", e.target.value)} className={`${inputCls} flex-1`} placeholder="Nº do chamado" />}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex w-40 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={!!form.crDedicado} onChange={(e) => { const v = e.target.checked; set("crDedicado", v); if (!v) set("cr", undefined); }} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
                    CR dedicado?
                  </label>
                  {form.crDedicado && <input value={form.cr ?? ""} onChange={(e) => set("cr", e.target.value)} className={`${inputCls} flex-1`} placeholder="Nº do CR" />}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex w-40 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={!!form.temInvestimento} onChange={(e) => { const v = e.target.checked; set("temInvestimento", v); if (!v) set("chamadoInvestimento", undefined); }} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
                    Investimento?
                  </label>
                  {form.temInvestimento && <input value={form.chamadoInvestimento ?? ""} onChange={(e) => set("chamadoInvestimento", e.target.value)} className={`${inputCls} flex-1`} placeholder="Nº do chamado de investimento" />}
                </div>
              </div>
            </>
          )}

          {/* LOCAÇÃO */}
          {fluxo === "IMPLANTACAO" && form.modalidade === "LOCACAO" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="CR de monitoramento"><input value={form.crMonitoramento ?? ""} onChange={(e) => set("crMonitoramento", e.target.value)} className={inputCls} /></Campo>
                <Campo label="CR de locação"><input value={form.crLocacao ?? ""} onChange={(e) => set("crLocacao", e.target.value)} className={inputCls} /></Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Valor da mensalidade (R$)"><MoedaInput value={form.mensal} onChange={(v) => set("mensal", v)} className={inputCls} placeholder="0,00" /></Campo>
                <Campo label="Valor de locação (R$)"><MoedaInput value={form.locacao} onChange={(v) => set("locacao", v)} className={inputCls} placeholder="0,00" /></Campo>
              </div>

              {/* Itens do projeto (Qtd + Item) — base dos equipamentos */}
              <div>
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Itens do projeto (equipamentos)</span>
                <div className="flex items-end gap-2">
                  <div className="w-20">
                    <span className="mb-1 block text-[10px] text-slate-400">Qtd</span>
                    <input type="number" min={1} value={qtdSel} onChange={(e) => setQtdSel(e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex-1">
                    <span className="mb-1 block text-[10px] text-slate-400">Item</span>
                    <select value={itemSel} onChange={(e) => setItemSel(e.target.value)} className={inputCls} disabled={ativos.length === 0}>
                      {ativos.map((it) => <option key={it.id} value={it.id}>{it.descricao} — {formatarBRL(it.preco)}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={addItem} disabled={ativos.length === 0} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">Adicionar</button>
                </div>
                {ativos.length === 0 && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Catálogo vazio — cadastre itens em “Itens”.</p>}

                {itens.length > 0 && (
                  <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                    {itens.map((it) => (
                      <li key={it.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                        <span className="min-w-0 truncate text-slate-700 dark:text-slate-200"><span className="font-medium">{it.quantidade}x</span> {it.descricao}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-slate-400">{formatarBRL((it.precoUnitario ?? 0) * it.quantidade)}</span>
                          <button type="button" onClick={() => removeItem(it.id)} className="text-xs font-medium text-rose-600 hover:underline">remover</button>
                        </span>
                      </li>
                    ))}
                    <li className="flex justify-between px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>Equipamentos</span><span>{formatarBRL(itemsCusto)}</span>
                    </li>
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Valor de mão de obra (R$)"><MoedaInput value={form.maoDeObra} onChange={(v) => set("maoDeObra", v)} className={inputCls} placeholder="0,00" /></Campo>
                <Campo label="Valor de equipamentos (auto = itens)"><input readOnly value={formatarBRL(itemsCusto)} className={`${inputCls} bg-slate-50 dark:bg-slate-800/60`} title="Soma dos itens do projeto" /></Campo>
              </div>

              <Campo label="Total (auto = M.O + equipamentos)"><input readOnly value={formatarBRL(totalLocacao)} className={`${inputCls} bg-slate-50 font-semibold dark:bg-slate-800/60`} /></Campo>

              <Campo label="Prioridade">
                <select value={form.prioridade} onChange={(e) => set("prioridade", e.target.value as Prioridade)} className={inputCls}>
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}
                </select>
              </Campo>

              <Campo label="Contato"><input value={form.contato ?? ""} onChange={(e) => set("contato", e.target.value)} className={inputCls} /></Campo>
            </>
          )}

          {/* VENDA */}
          {fluxo === "IMPLANTACAO" && form.modalidade === "VENDA" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="CR de serviço"><input value={form.crServico ?? ""} onChange={(e) => set("crServico", e.target.value)} className={inputCls} /></Campo>
                <Campo label="CR de material"><input value={form.crMaterial ?? ""} onChange={(e) => set("crMaterial", e.target.value)} className={inputCls} /></Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="CR de mensalidade"><input value={form.crMensalidade ?? ""} onChange={(e) => set("crMensalidade", e.target.value)} className={inputCls} /></Campo>
                <Campo label="Valor de mensalidade (R$)"><MoedaInput value={form.mensal} onChange={(v) => set("mensal", v)} className={inputCls} placeholder="0,00" /></Campo>
              </div>

              <Campo label="Margem de venda (%)">
                <input inputMode="decimal" value={form.margem ?? ""} onChange={(e) => set("margem", num(e.target.value))} className={inputCls} placeholder="Ex.: 30" />
                <span className="mt-0.5 block text-[10px] text-slate-400">Aplicada sobre cada item na parte de equipamentos (material).</span>
              </Campo>

              {/* Itens do projeto (Qtd + Item) — base do material */}
              <div>
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Itens do projeto (material)</span>
                <div className="flex items-end gap-2">
                  <div className="w-20">
                    <span className="mb-1 block text-[10px] text-slate-400">Qtd</span>
                    <input type="number" min={1} value={qtdSel} onChange={(e) => setQtdSel(e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex-1">
                    <span className="mb-1 block text-[10px] text-slate-400">Item</span>
                    <select value={itemSel} onChange={(e) => setItemSel(e.target.value)} className={inputCls} disabled={ativos.length === 0}>
                      {ativos.map((it) => <option key={it.id} value={it.id}>{it.descricao} — {formatarBRL(it.preco)}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={addItem} disabled={ativos.length === 0} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">Adicionar</button>
                </div>
                {ativos.length === 0 && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Catálogo vazio — cadastre itens em “Itens”.</p>}

                {itens.length > 0 && (
                  <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                    {itens.map((it) => (
                      <li key={it.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                        <span className="min-w-0 truncate text-slate-700 dark:text-slate-200"><span className="font-medium">{it.quantidade}x</span> {it.descricao}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-slate-400">{formatarBRL((it.precoUnitario ?? 0) * it.quantidade)}</span>
                          <button type="button" onClick={() => removeItem(it.id)} className="text-xs font-medium text-rose-600 hover:underline">remover</button>
                        </span>
                      </li>
                    ))}
                    <li className="flex justify-between px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>Custo dos itens</span><span>{formatarBRL(itemsCusto)}</span>
                    </li>
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Valor de serviço (R$)"><MoedaInput value={form.maoDeObra} onChange={(v) => set("maoDeObra", v)} className={inputCls} placeholder="0,00" /></Campo>
                <Campo label="Valor de material (auto = itens + margem)"><input readOnly value={formatarBRL(materialVenda)} className={`${inputCls} bg-slate-50 dark:bg-slate-800/60`} title="Soma dos itens com a margem aplicada" /></Campo>
              </div>

              <Campo label="Total (auto = serviço + material)"><input readOnly value={formatarBRL(totalVenda)} className={`${inputCls} bg-slate-50 font-semibold dark:bg-slate-800/60`} /></Campo>

              <Campo label="Prioridade">
                <select value={form.prioridade} onChange={(e) => set("prioridade", e.target.value as Prioridade)} className={inputCls}>
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}
                </select>
              </Campo>

              <Campo label="Contato"><input value={form.contato ?? ""} onChange={(e) => set("contato", e.target.value)} className={inputCls} /></Campo>
            </>
          )}

          {fluxo === "MANUTENCAO" && (
            <>
              {/* Orçamento x Visita: define quais campos aparecem (novos cards). */}
              <Campo label="Tipo de entrada">
                <div className="flex gap-2">
                  {(["ORCAMENTO", "VISITA"] as TipoEntradaManutencao[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setM("tipo", t);
                        // Limpa os campos que não pertencem ao tipo escolhido.
                        if (t === "VISITA") { set("numeroOrcamento", undefined); set("total", undefined); }
                        if (t === "ORCAMENTO") setM("valorVisita", undefined);
                      }}
                      className={["flex-1 rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-inset transition", man.tipo === t ? TIPO_ENTRADA_META[t].classe : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"].join(" ")}
                    >
                      {TIPO_ENTRADA_META[t].rotulo}
                    </button>
                  ))}
                </div>
              </Campo>

              <Campo label="Data da visita">
                <input type="date" value={man.dataVisita ?? ""} onChange={(e) => setM("dataVisita", e.target.value || undefined)} className={inputCls} />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Visita cobrada">
                  <select
                    value={man.visitaCobrada ? "sim" : "nao"}
                    onChange={(e) => {
                      const sim = e.target.value === "sim";
                      setM("visitaCobrada", sim);
                      // "Não": esconde o campo e zera o valor para não ficar resíduo.
                      if (!sim) setM("valorVisita", undefined);
                    }}
                    className={inputCls}
                  >
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </Campo>
                <Campo label="Turno">
                  <select value={man.turno ?? ""} onChange={(e) => setM("turno", (e.target.value || undefined) as Turno | undefined)} className={inputCls}>
                    <option value="">—</option>
                    <option value="MANHA">Manhã</option>
                    <option value="TARDE">Tarde</option>
                    <option value="DIA">Dia</option>
                  </select>
                </Campo>
              </div>

              {/* Valor da visita: só quando a visita é cobrada — e some no tipo Orçamento. */}
              {man.visitaCobrada && man.tipo !== "ORCAMENTO" && (
                <Campo label="Valor da visita (R$)">
                  <MoedaInput value={man.valorVisita} onChange={(v) => setM("valorVisita", v)} className={inputCls} placeholder="0,00" />
                </Campo>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Número da conta"><input value={form.numeroConta ?? ""} onChange={(e) => set("numeroConta", e.target.value)} className={inputCls} placeholder="Identificador do cliente" /></Campo>
                <Campo label="Região (POA, metropolitana e bairros)">
                  <input list="regioes-poa-datalist" value={man.regiao ?? ""} onChange={(e) => setM("regiao", e.target.value)} className={inputCls} placeholder="Selecione ou pesquise" />
                  <datalist id="regioes-poa-datalist">{REGIOES_POA.map((c) => <option key={c} value={c} />)}</datalist>
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Ordem de serviço">
                  <input value={man.ordemServico ?? ""} onChange={(e) => setM("ordemServico", e.target.value)} className={inputCls} />
                </Campo>
                <Campo label="Agendado">
                  <select value={man.agendado ? "sim" : "nao"} onChange={(e) => setM("agendado", e.target.value === "sim")} className={inputCls}>
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Técnico"><ComboPessoa value={man.tecnico ?? ""} onChange={(v) => setM("tecnico", v)} opcoes={tecnicosAtivos} className={inputCls} placeholder="Selecione ou pesquise" /></Campo>
                <Campo label="Auxiliar técnico"><ComboPessoa value={man.auxiliarTecnico ?? ""} onChange={(v) => setM("auxiliarTecnico", v)} opcoes={tecnicosAtivos} className={inputCls} placeholder="Selecione ou pesquise" /></Campo>
              </div>

              {/* Nº e valor do orçamento somem no tipo Visita. */}
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Tipo de atendimento"><input value={man.tipoAtendimento ?? ""} onChange={(e) => setM("tipoAtendimento", e.target.value)} className={inputCls} /></Campo>
                {man.tipo !== "VISITA" && (
                  <Campo label="Número do orçamento"><input value={form.numeroOrcamento ?? ""} onChange={(e) => set("numeroOrcamento", e.target.value)} className={inputCls} /></Campo>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Setor"><input value={man.setor ?? ""} onChange={(e) => setM("setor", e.target.value)} className={inputCls} /></Campo>
                {man.tipo !== "VISITA" && (
                  <Campo label="Valor do orçamento (R$)"><MoedaInput value={form.total} onChange={(v) => set("total", v)} className={inputCls} placeholder="0,00" /></Campo>
                )}
              </div>
            </>
          )}

          <Campo label="Observações"><textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} className={`${inputCls} resize-none`} /></Campo>

          {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{erro}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
          <button onClick={submeter} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{edicao ? "Salvar alterações" : "Cadastrar"}</button>
        </footer>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

/** Formata número como moeda pt-BR sem símbolo: 1000 -> "1.000,00". */
function formatMoeda(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Campo de valor com máscara pt-BR (milhar com "." e decimais com ","). O usuário
 * digita o número e ao sair vê, p.ex., 1000 -> 1.000,00. Propaga o número via onChange.
 */
function MoedaInput({ value, onChange, className, placeholder }: { value?: number; onChange: (v?: number) => void; className?: string; placeholder?: string }) {
  const [txt, setTxt] = useState("");
  const [focado, setFocado] = useState(false);
  useEffect(() => {
    if (!focado) setTxt(value != null ? formatMoeda(value) : "");
  }, [value, focado]);
  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d,]/g, "");
    const partes = raw.split(",");
    const inteiro = partes[0].replace(/\D/g, "");
    const dec = partes.length > 1 ? partes[1].slice(0, 2) : null;
    const intFmt = inteiro ? Number(inteiro).toLocaleString("pt-BR") : (dec != null ? "0" : "");
    setTxt(dec != null ? `${intFmt},${dec}` : intFmt);
    if (!inteiro && dec == null) { onChange(undefined); return; }
    const num = Number(`${inteiro || "0"}.${dec ?? "0"}`);
    onChange(Number.isFinite(num) ? num : undefined);
  }
  return (
    <input inputMode="decimal" value={txt} onChange={handle} onFocus={() => setFocado(true)} onBlur={() => setFocado(false)} className={className} placeholder={placeholder} />
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
