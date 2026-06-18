"use client";

import { useEffect, useState } from "react";
import type { ItemCatalogo, NovoItem } from "@/lib/catalogo-store";

interface ItemFormProps {
  aberto: boolean;
  inicial?: ItemCatalogo | null;
  onFechar: () => void;
  onSubmit: (i: NovoItem) => void;
}

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export function ItemForm({ aberto, inicial, onFechar, onSubmit }: ItemFormProps) {
  const [descricao, setDescricao] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [preco, setPreco] = useState("0");
  const [ativo, setAtivo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const edicao = !!inicial;

  useEffect(() => {
    if (!aberto) return;
    setDescricao(inicial?.descricao ?? "");
    setUnidade(inicial?.unidade ?? "un");
    setPreco(inicial ? String(inicial.preco) : "0");
    setAtivo(inicial?.ativo ?? true);
    setErro(null);
  }, [aberto, inicial]);

  if (!aberto) return null;

  function submeter() {
    if (!descricao.trim()) return setErro("Informe a descrição.");
    const p = Number(preco.replace(",", "."));
    onSubmit({ descricao: descricao.trim(), unidade: unidade.trim() || "un", preco: Number.isFinite(p) ? p : 0, ativo });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onFechar} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-card bg-white shadow-xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{edicao ? "Editar item" : "Novo item"}</h2>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">✕</button>
        </header>
        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Descrição</span>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={inputCls} placeholder="Ex.: CÂMERA DOME HD" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Unidade</span>
              <input value={unidade} onChange={(e) => setUnidade(e.target.value)} className={inputCls} placeholder="un / m" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Preço (R$)</span>
              <input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Item ativo (disponível no cadastro)
          </label>
          {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{erro}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
          <button onClick={submeter} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{edicao ? "Salvar" : "Cadastrar"}</button>
        </footer>
      </div>
    </div>
  );
}
