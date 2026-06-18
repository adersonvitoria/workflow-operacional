"use client";

import { useCards } from "@/lib/store";
import { rotuloEtapa } from "@/lib/routing";

/** Visão consolidada dos materiais de todos os cards (base p/ Compras/Almox). */
export function EstoqueView() {
  const { cards } = useCards();
  const itens = cards.flatMap((c) =>
    c.materiais.map((m) => ({ ...m, cliente: c.cliente.nome, codigo: c.codigo, etapa: c.etapa })),
  );

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Estoque & Materiais</h1>
        <p className="text-xs text-slate-400">{itens.length} itens vinculados a cards</p>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface-app p-6 scrollbar-hide dark:bg-slate-950">
        <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2.5 font-medium">Material</th>
                <th className="px-4 py-2.5 font-medium">Qtd</th>
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Etapa</th>
                <th className="px-4 py-2.5 font-medium">Fornecedor</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum material cadastrado nos cards ainda.</td></tr>
              ) : (
                itens.map((m) => (
                  <tr key={`${m.codigo}-${m.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{m.descricao}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{m.quantidade}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{m.cliente}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{rotuloEtapa(m.etapa)}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{m.fornecedor ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{m.statusAlmox}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
