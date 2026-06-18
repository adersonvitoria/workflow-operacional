"use client";

import { useEffect, useState } from "react";
import { MODALIDADE_META } from "@/lib/flows";
import type { NovoCardInput } from "@/lib/store";
import type { Card, Fluxo, Modalidade, Prioridade } from "@/types";

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
  const [form, setForm] = useState<NovoCardInput>(VAZIO(fluxo));
  const [erro, setErro] = useState<string | null>(null);
  const edicao = !!inicial;

  useEffect(() => {
    if (!aberto) return;
    if (inicial) {
      setForm({
        fluxo: inicial.fluxo,
        clienteNome: inicial.cliente.nome,
        documento: inicial.cliente.documento,
        contato: inicial.cliente.contato,
        endereco: inicial.cliente.endereco,
        modalidade: inicial.modalidade,
        prioridade: inicial.prioridade,
        cr: inicial.cr,
        cc: inicial.cc,
        chamado: inicial.chamado,
        maoDeObra: inicial.valores.maoDeObra,
        equipamentos: inicial.valores.equipamentos,
        total: inicial.valores.total,
        mensal: inicial.valores.mensal,
        observacoes: inicial.observacoes,
      });
    } else {
      setForm(VAZIO(fluxo));
    }
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

  function submeter() {
    if (!form.clienteNome.trim()) return setErro("Informe o nome do cliente.");
    if (fluxo === "IMPLANTACAO" && !form.modalidade) return setErro("Selecione a modalidade (Locação ou Venda).");
    if (!form.total && !form.mensal) return setErro("Informe ao menos um valor (Total ou Mensal).");
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onFechar} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-card bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">
            {edicao ? `Editar #${inicial?.codigo}` : "Nova entrada comercial"}
          </h2>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Fechar">✕</button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <Campo label="Cliente *">
            <input value={form.clienteNome} onChange={(e) => set("clienteNome", e.target.value)} className={inputCls} placeholder="Razão social / nome" />
          </Campo>

          {fluxo === "IMPLANTACAO" && (
            <Campo label="Modalidade *">
              <div className="flex gap-2">
                {(["LOCACAO", "VENDA"] as Modalidade[]).map((m) => (
                  <button key={m} type="button" onClick={() => set("modalidade", m)}
                    className={["flex-1 rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-inset transition", form.modalidade === m ? MODALIDADE_META[m].classe : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"].join(" ")}>
                    {MODALIDADE_META[m].rotulo}
                  </button>
                ))}
              </div>
            </Campo>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Campo label="CR (Centro de Resultado)"><input value={form.cr ?? ""} onChange={(e) => set("cr", e.target.value)} className={inputCls} /></Campo>
            <Campo label="CC (Centro de Custo)"><input value={form.cc ?? ""} onChange={(e) => set("cc", e.target.value)} className={inputCls} /></Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Valor total (R$)"><input inputMode="decimal" value={form.total ?? ""} onChange={(e) => set("total", num(e.target.value))} className={inputCls} /></Campo>
            <Campo label="Mensal (R$)"><input inputMode="decimal" value={form.mensal ?? ""} onChange={(e) => set("mensal", num(e.target.value))} className={inputCls} /></Campo>
            <Campo label="Mão de obra (R$)"><input inputMode="decimal" value={form.maoDeObra ?? ""} onChange={(e) => set("maoDeObra", num(e.target.value))} className={inputCls} /></Campo>
            <Campo label="Equipamentos (R$)"><input inputMode="decimal" value={form.equipamentos ?? ""} onChange={(e) => set("equipamentos", num(e.target.value))} className={inputCls} /></Campo>
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
          <Campo label="Observações"><textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} className={`${inputCls} resize-none`} /></Campo>

          {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{erro}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={submeter} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{edicao ? "Salvar alterações" : "Cadastrar"}</button>
        </footer>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
