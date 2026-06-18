"use client";

import { useState } from "react";
import { useAuth, type NovoUsuario, type Usuario } from "@/lib/auth";
import { PERFIL_META, podeGerenciarUsuarios } from "@/lib/perfis";
import { UserForm } from "@/components/auth/UserForm";

export function UsuariosView() {
  const { atual, usuarios, criarUsuario, atualizarUsuario, removerUsuario } = useAuth();
  const [formAberto, setFormAberto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const pode = podeGerenciarUsuarios(atual?.perfil);

  function salvar(u: NovoUsuario) {
    if (editId) atualizarUsuario(editId, u);
    else criarUsuario(u);
    setFormAberto(false);
    setEditId(null);
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Usuários & Perfis</h1>
          <p className="text-xs text-slate-400">{usuarios.length} usuários · permissões por perfil</p>
        </div>
        {pode && (
          <button onClick={() => { setEditId(null); setFormAberto(true); }} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
            + Novo usuário
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto bg-surface-app p-6 scrollbar-hide dark:bg-slate-950">
        {!pode ? (
          <p className="text-sm text-slate-400">Você não tem permissão para gerenciar usuários.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">E-mail</th>
                  <th className="px-4 py-2.5 font-medium">Perfil</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                      {u.nome}
                      {atual?.id === u.id && <span className="ml-2 text-[10px] font-medium text-brand">(você)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${PERFIL_META[u.perfil].classe}`}>
                        {PERFIL_META[u.perfil].rotulo}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={u.ativo ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                        {u.ativo ? "● Ativo" : "○ Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => { setEditId(u.id); setFormAberto(true); }} className="rounded px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10">Editar</button>
                      <button onClick={() => removerUsuario(u.id)} className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserForm
        aberto={formAberto}
        inicial={editId ? usuarios.find((u) => u.id === editId) : null}
        onFechar={() => { setFormAberto(false); setEditId(null); }}
        onSubmit={salvar}
      />
    </>
  );
}
