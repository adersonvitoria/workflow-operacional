"use client";

import { useEffect, useState } from "react";
import { CRITICIDADE_META, formatarBRL, MODALIDADE_META, TIPO_CLIENTE_META } from "@/lib/flows";
import { useCatalogo } from "@/lib/catalogo-store";
import type { NovoCardInput } from "@/lib/store";
import type { Card, DadosManutencao, Fluxo, ItemMaterial, Modalidade, Prioridade, TipoCliente, Turno } from "@/types";

interface CardFormProps {
  aberto: boolean;
  fluxo: Fluxo;
  /** Quando presente, o formulário entra em modo edição. */
  inicial?: Card | null;
  onFechar: () => void;
  onSubmit: (values: NovoCardInput) => void;
}

const VAZIO = (fluxo: Fluxo): NovoCardInput => ({
  fluxo,
  clienteNome: "",
  prioridade: "NORMAL",
});

const PRIORIDADES: Prioridade[] = ["BAIXA", "NORMAL", "ALTA", "URGENTE"];

/** Modal de cadastro/edição de card. */
export function CardForm({ aberto, fluxo, inicial, onFechar, onSubmit }: CardFormProps) {
  const { ativos } = useCatalogo();
  const [form, setForm] = useState<NovoCardInput>(VAZIO(fluxo));
  const [itens, setItens] = useState<ItemMaterial[]>([]);
  const [itemSel, setItemSel] = useState<string>("");
  const [qtdSel, setQtdSel] = useState<string>("1");
  const [erro, setErro] = useState<string | null>(null);
  const edicao = !!inicial;

  // Valores derivados dos itens do projeto.
  const equipamentos = itens.reduce((s, m) => s + (m.precoUnitario ?? 0) * m.quantidade, 0);
  const totalCalc = (form.maoDeObra ?? 0) + equipamentos;

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
        chamado: inicial.chamado,
        numeroConta: inicial.numeroConta,
        dataCadastro: inicial.datas?.abertura?.slice(0, 10),
        maoDeObra: inicial.valores.maoDeObra,
        equipamentos: inicial.valores.equipamentos,
        total: inicial.valores.total,
        mensal: inicial.valores.mensal,
        numeroOrcamento: inicial.numeroOrcamento,
        manutencao: inicial.manutencao,
        observacoes: inicial.observacoes,
      });
    } else {
      setForm(VAZIO(fluxo));
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
      if (!totalCalc && !form.mensal) return setErro("Adicione itens (Total/Equipamentos) ou informe o Mensal.");
      onSubmit({ ...form, equipamentos, total: totalCalc, materiais: itens });
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
            <input type="date" value={form.dataCadastro ?? ""} onChange={(e) => set("dataCadastro", e.target.value || undefined)} className={inputCls} />
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

          {fluxo === "IMPLANTACAO" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="CR (Centro de Resultado)"><input value={form.cr ?? ""} onChange={(e) => set("cr", e.target.value)} className={inputCls} /></Campo>
                <Campo label="CC (Centro de Custo)"><input value={form.cc ?? ""} onChange={(e) => set("cc", e.target.value)} className={inputCls} /></Campo>
              </div>

              <Campo label="Número da conta"><input value={form.numeroConta ?? ""} onChange={(e) => set("numeroConta", e.target.value)} className={inputCls} placeholder="Identificador do cliente" /></Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Mão de obra (R$)"><input inputMode="decimal" value={form.maoDeObra ?? ""} onChange={(e) => set("maoDeObra", num(e.target.value))} className={inputCls} /></Campo>
                <Campo label="Mensal (R$)"><input inputMode="decimal" value={form.mensal ?? ""} onChange={(e) => set("mensal", num(e.target.value))} className={inputCls} /></Campo>
                <Campo label="Equipamentos (auto)"><input readOnly value={formatarBRL(equipamentos)} className={`${inputCls} bg-slate-50 dark:bg-slate-800/60`} title="Calculado a partir dos itens" /></Campo>
                <Campo label="Total (auto = M.O + equip.)"><input readOnly value={formatarBRL(totalCalc)} className={`${inputCls} bg-slate-50 font-semibold dark:bg-slate-800/60`} /></Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Prioridade">
                  <select value={form.prioridade} onChange={(e) => set("prioridade", e.target.value as Prioridade)} className={inputCls}>
                    {PRIORIDADES.map((p) => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}
                  </select>
                </Campo>
                <Campo label="Chamado / OS"><input value={form.chamado ?? ""} onChange={(e) => set("chamado", e.target.value)} className={inputCls} /></Campo>
              </div>

              <Campo label="Contato"><input value={form.contato ?? ""} onChange={(e) => set("contato", e.target.value)} className={inputCls} /></Campo>

              {/* Itens do projeto (Qtd + Item) */}
              <div>
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Itens do projeto {form.modalidade ? `(${MODALIDADE_META[form.modalidade].rotulo})` : ""}
                </span>
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
                      <span>Equipamentos</span><span>{formatarBRL(equipamentos)}</span>
                    </li>
                  </ul>
                )}
              </div>
            </>
          )}

          {fluxo === "MANUTENCAO" && (
            <>
              <Campo label="Data da visita">
                <input type="date" value={man.dataVisita ?? ""} onChange={(e) => setM("dataVisita", e.target.value || undefined)} className={inputCls} />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Visita cobrada">
                  <select value={man.visitaCobrada ? "sim" : "nao"} onChange={(e) => setM("visitaCobrada", e.target.value === "sim")} className={inputCls}>
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

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Número da conta"><input value={form.numeroConta ?? ""} onChange={(e) => set("numeroConta", e.target.value)} className={inputCls} placeholder="Identificador do cliente" /></Campo>
                <Campo label="Região"><input value={man.regiao ?? ""} onChange={(e) => setM("regiao", e.target.value)} className={inputCls} /></Campo>
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
                <Campo label="Técnico"><input value={man.tecnico ?? ""} onChange={(e) => setM("tecnico", e.target.value)} className={inputCls} placeholder="Nome do técnico" /></Campo>
                <Campo label="Auxiliar técnico"><input value={man.auxiliarTecnico ?? ""} onChange={(e) => setM("auxiliarTecnico", e.target.value)} className={inputCls} placeholder="Nome do auxiliar" /></Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Tipo de atendimento"><input value={man.tipoAtendimento ?? ""} onChange={(e) => setM("tipoAtendimento", e.target.value)} className={inputCls} /></Campo>
                <Campo label="Número do orçamento"><input value={form.numeroOrcamento ?? ""} onChange={(e) => set("numeroOrcamento", e.target.value)} className={inputCls} /></Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Setor"><input value={man.setor ?? ""} onChange={(e) => setM("setor", e.target.value)} className={inputCls} /></Campo>
                <Campo label="Valor do orçamento (R$)"><input inputMode="decimal" value={form.total ?? ""} onChange={(e) => set("total", num(e.target.value))} className={inputCls} placeholder="0,00" /></Campo>
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
