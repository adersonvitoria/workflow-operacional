"use client";

import { useRef, useState } from "react";
import { useExtracaoIA } from "@/lib/config-ia";
import type { ItemCompra } from "@/types";

export interface OrcamentoImportado {
  cliente: string;
  numeroOrcamento?: string;
  dataAprovacao?: string; // YYYY-MM-DD
  itens: ItemCompra[];
}

interface ImportarOrcamentoProps {
  aberto: boolean;
  onFechar: () => void;
  /** Chamado quando o usuário confirma os dados revisados. */
  onCriar: (dados: OrcamentoImportado) => Promise<void>;
}

const inp = "w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

/**
 * Importa um orçamento (PDF padrão) para a esteira de Compras: envia o PDF
 * para a extração por IA, mostra tudo EDITÁVEL para revisão e só cria o card
 * quando o usuário confirma.
 */
export function ImportarOrcamento({ aberto, onFechar, onCriar }: ImportarOrcamentoProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<OrcamentoImportado | null>(null);
  // Cadastro manual: caminho padrão enquanto a leitura por IA está desligada.
  const [manual, setManual] = useState(false);
  const iaAtiva = useExtracaoIA();

  if (!aberto) return null;

  function reset() {
    setDados(null);
    setErro(null);
    setLendo(false);
    setCriando(false);
    setManual(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Abre o formulário vazio, com uma linha de item pronta para preencher. */
  function iniciarManual() {
    setErro(null);
    setManual(true);
    setDados({
      cliente: "",
      numeroOrcamento: undefined,
      dataAprovacao: new Date().toISOString().slice(0, 10),
      itens: [{ id: `ic-novo-${Date.now()}`, quantidade: 1, material: "", statusPagamento: "PENDENTE" }],
    });
  }

  async function lerPdf(file: File) {
    setErro(null);
    if (file.type !== "application/pdf") return setErro("Selecione um arquivo PDF.");
    if (file.size > 3 * 1024 * 1024) return setErro("PDF muito grande (máx. 3 MB).");
    setLendo(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const pdfBase64 = btoa(bin);
      const res = await fetch("/api/compras/extrair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pdfBase64 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro ?? "Falha na leitura do PDF.");
      setDados({
        cliente: json.cliente ?? "",
        numeroOrcamento: json.numeroOrcamento || undefined,
        dataAprovacao: json.dataAprovacao || undefined,
        itens: Array.isArray(json.itens) ? json.itens : [],
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na leitura do PDF.");
    } finally {
      setLendo(false);
    }
  }

  function setItem(id: string, patch: Partial<ItemCompra>) {
    setDados((d) => (d ? { ...d, itens: d.itens.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : d));
  }
  function addItem() {
    setDados((d) =>
      d
        ? { ...d, itens: [...d.itens, { id: `ic-novo-${Date.now()}`, quantidade: 1, material: "", statusPagamento: "PENDENTE" }] }
        : d,
    );
  }
  function removeItem(id: string) {
    setDados((d) => (d ? { ...d, itens: d.itens.filter((i) => i.id !== id) } : d));
  }

  async function confirmar() {
    if (!dados) return;
    if (!dados.cliente.trim()) return setErro("Informe o nome do cliente.");
    const itensValidos = dados.itens.filter((i) => i.material.trim());
    if (itensValidos.length === 0) return setErro("Inclua ao menos um item.");
    setCriando(true);
    setErro(null);
    try {
      await onCriar({ ...dados, itens: itensValidos });
      reset();
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar o card.");
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => { reset(); onFechar(); }} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-card bg-white shadow-xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {iaAtiva === false ? "Cadastrar orçamento" : "Importar orçamento (PDF)"}
          </h2>
          <button onClick={() => { reset(); onFechar(); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">✕</button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4 scrollbar-hide">
          {!dados && (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
              {iaAtiva === false ? (
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                  A leitura automática de PDF está desativada neste ambiente.
                  <strong> Cadastre o orçamento manualmente</strong> — cliente, número, data e itens.
                </p>
              ) : (
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                  Selecione o PDF do orçamento aprovado. A IA extrai o cliente, a data e os itens —
                  <strong> você revisa tudo antes de criar o card.</strong>
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void lerPdf(f); }}
              />
              <div className="flex flex-wrap items-center justify-center gap-2">
                {iaAtiva !== false && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={lendo}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {lendo ? "Lendo o PDF…" : "Escolher PDF"}
                  </button>
                )}
                <button
                  onClick={iniciarManual}
                  className={iaAtiva === false
                    ? "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    : "rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}
                >
                  ✎ Cadastrar manualmente
                </button>
              </div>
            </div>
          )}

          {dados && (
            <>
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
                {manual
                  ? "Cadastro manual: preencha o cliente, o número do orçamento e os itens."
                  : "Revise os dados extraídos — corrija o que a IA tiver lido errado antes de criar."}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Cliente *</span>
                  <input value={dados.cliente} onChange={(e) => setDados({ ...dados, cliente: e.target.value })} className={inp} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Nº do orçamento</span>
                  <input value={dados.numeroOrcamento ?? ""} onChange={(e) => setDados({ ...dados, numeroOrcamento: e.target.value || undefined })} className={inp} />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Data de aprovação do orçamento</span>
                <input type="date" value={dados.dataAprovacao ?? ""} onChange={(e) => setDados({ ...dados, dataAprovacao: e.target.value || undefined })} className={inp} />
              </label>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Itens ({dados.itens.length})</span>
                  <button onClick={addItem} className="text-xs font-medium text-brand hover:underline">+ adicionar item</button>
                </div>
                <ul className="space-y-1.5">
                  {dados.itens.map((i) => (
                    <li key={i.id} className="flex items-center gap-2">
                      <input
                        type="number" min={1} value={i.quantidade}
                        onChange={(e) => setItem(i.id, { quantidade: Math.max(1, Number(e.target.value) || 1) })}
                        className={`${inp} w-16 shrink-0`}
                        title="Quantidade"
                      />
                      <input value={i.material} onChange={(e) => setItem(i.id, { material: e.target.value })} className={`${inp} flex-1`} placeholder="Material" />
                      <input value={i.setor ?? ""} onChange={(e) => setItem(i.id, { setor: e.target.value || undefined })} className={`${inp} w-36 shrink-0`} placeholder="Setor" />
                      <button onClick={() => removeItem(i.id)} className="shrink-0 text-xs font-medium text-rose-600 hover:underline">remover</button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{erro}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          {dados && iaAtiva !== false && (
            <button onClick={reset} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Ler outro PDF</button>
          )}
          <button onClick={() => { reset(); onFechar(); }} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
          {dados && (
            <button onClick={() => void confirmar()} disabled={criando} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {criando ? "Criando…" : "Criar card na esteira"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
