"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function login() {
    setOcupado(true);
    const r = await entrar(email, senha);
    setOcupado(false);
    if (!r.ok) return setErro(r.motivo ?? "Falha no login.");
    router.push("/dashboard");
  }

  return (
    <div className="h-screen overflow-y-auto bg-surface-app scrollbar-hide dark:bg-slate-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-8 px-6 py-10">
        {/* Marca + formulário */}
        <div className="w-full max-w-sm rounded-card border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 text-center">
            <span className="text-xl font-bold tracking-tight text-brand-navy dark:text-white">
GPSTec<span className="text-brand-600">-POA</span>
            </span>
            <p className="mt-1 text-xs text-slate-400">Gestão operacional · Segurança eletrônica</p>
          </div>

          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">E-mail</label>
          <input
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErro(null); }}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="seu.email@empresa.com"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <label className="mb-1 mt-3 block text-xs font-medium text-slate-500 dark:text-slate-400">Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(null); }}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          {erro && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{erro}</p>}
          <button onClick={login} disabled={ocupado} className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {ocupado ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
