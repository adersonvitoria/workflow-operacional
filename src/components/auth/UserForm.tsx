"use client";

import { useEffect, useState } from "react";
import { PERFIL_META, PERFIS, type Perfil } from "@/lib/perfis";
import type { NovoUsuario, Usuario } from "@/lib/auth";

interface UserFormProps {
  aberto: boolean;
  inicial?: Usuario | null;
  onFechar: () => void;
  onSubmit: (u: NovoUsuario) => void;
}

export function UserForm({ aberto, inicial, onFechar, onSubmit }: UserFormProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("COMERCIAL");
  const [ativo, setAtivo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const edicao = !!inicial;

  useEffect(() => {
    if (!aberto) return;
    setNome(inicial?.nome ?? "");
    setEmail(inicial?.email ?? "");
    setPerfil(inicial?.perfil ?? "COMERCIAL");
    setAtivo(inicial?.ativo ?? true);
    setErro(null);
  }, [aberto, inicial]);

  if (!aberto) return null;

  function submeter() {
    if (!nome.trim()) return setErro("Informe o nome.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErro("E-mail inválido.");
    onSubmit({ nome: nome.trim(), email: email.trim(), perfil, ativo });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onFechar} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-card bg-white shadow-xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{edicao ? "Editar usuário" : "Novo usuário"}</h2>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">✕</button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <Campo label="Nome">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="E-mail">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="usuario@empresa.com" />
          </Campo>
          <Campo label="Perfil">
            <select value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)} className={inputCls}>
              {PERFIS.map((p) => <option key={p} value={p}>{PERFIL_META[p].rotulo}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">{PERFIL_META[perfil].descricao}</p>
          </Campo>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Usuário ativo
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

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
