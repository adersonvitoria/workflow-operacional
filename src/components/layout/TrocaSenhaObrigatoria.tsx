"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

const MIN_SENHA = 8;

/**
 * Bloqueio de primeiro acesso: quem entra com senha definida por terceiro
 * (cadastro novo ou redefinição pelo gestor) precisa trocar antes de usar o
 * sistema. Cobre a tela inteira — a única saída é trocar a senha ou sair.
 */
export function TrocaSenhaObrigatoria() {
  const { atual, atualizarPerfil, sair } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!atual?.precisaTrocarSenha) return null;

  const inp = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nova.length < MIN_SENHA) return setErro(`A nova senha deve ter ao menos ${MIN_SENHA} caracteres.`);
    if (nova !== confirma) return setErro("A confirmação não confere com a nova senha.");
    setSalvando(true);
    const r = await atualizarPerfil({ senhaAtual, novaSenha: nova });
    setSalvando(false);
    if (!r.ok) setErro(r.motivo ?? "Não foi possível alterar a senha.");
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Defina uma nova senha</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sua senha atual foi definida por outra pessoa (ou é uma senha antiga). Para continuar, escolha uma senha pessoal com pelo menos {MIN_SENHA} caracteres.
        </p>

        <form onSubmit={salvar} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Senha atual</span>
            <input type="password" autoComplete="current-password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} className={inp} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Nova senha</span>
            <input type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} className={inp} required minLength={MIN_SENHA} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Confirme a nova senha</span>
            <input type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} className={inp} required minLength={MIN_SENHA} />
          </label>

          {erro && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30">
              ⚠ {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar e continuar"}
          </button>
          <button
            type="button"
            onClick={() => void sair()}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
