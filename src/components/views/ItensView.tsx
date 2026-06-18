"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCatalogo, type NovoItem } from "@/lib/catalogo-store";
import { podeGerenciarItens } from "@/lib/perfis";
import { formatarBRL } from "@/lib/flows";
import { ItemForm } from "@/components/catalogo/ItemForm";

export function ItensView() {
  const { atual } = useAuth();
  const { itens, criar, atualizar, remover } = useCatalogo();
  const [formAberto, setFormAberto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const pode = podeGerenciarItens(atual?.perfil);

  async function salvar(i: NovoItem) {
    if (editId) await atualizar(editId, i);
    else await criar(i);
    setFormAberto(false);
    setEditId(null);
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Itens do catálogo</h1>
          <p className="text-xs text-slate-400">{itens.length} itens · usados no cadastro de projetos</p>
        </div>
        {pode && (
          <button onClick={() => { setEditId(null); setFormAberto(true); }} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
            + Novo item
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto bg-surface-app p-6 scrollbar-hide dark:bg-slate-950">
        {!pode ? (
          <p className="text-sm text-slate-400">Você não tem permissão para gerenciar o catálogo.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">Unidade</th>
                  <th className="px-4 py-2.5 font-medium">Preço</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {itens.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhum item cadastrado.</td></tr>
                ) : (
                  itens.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{it.descricao}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{it.unidade}</td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{formatarBRL(it.preco)}</td>
                      <td className="px-4 py-2.5">
                        <span className={it.ativo ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>{it.ativo ? "● Ativo" : "○ Inativo"}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => { setEditId(it.id); setFormAberto(true); }} className="rounded px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10">Editar</button>
                        <button onClick={() => remover(it.id)} className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15">Remover</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ItemForm
        aberto={formAberto}
        inicial={editId ? itens.find((i) => i.id === editId) : null}
        onFechar={() => { setFormAberto(false); setEditId(null); }}
        onSubmit={salvar}
      />
    </>
  );
}
