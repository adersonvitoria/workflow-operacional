"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { PERFIL_META } from "@/lib/perfis";

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export function ConfiguracoesView() {
  const { atual, atualizarPerfil } = useAuth();
  const [nome, setNome] = useState(atual?.nome ?? "");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  if (!atual) return null;

  async function salvarNome() {
    setMsg(null);
    const n = nome.trim();
    if (!n) { setMsg({ tipo: "erro", texto: "Informe o nome de exibição." }); return; }
    setSalvandoNome(true);
    const r = await atualizarPerfil({ nome: n });
    setSalvandoNome(false);
    setMsg(r.ok ? { tipo: "ok", texto: "Nome de exibição atualizado." } : { tipo: "erro", texto: r.motivo ?? "Falha ao salvar." });
  }

  async function alterarSenha() {
    setMsg(null);
    if (!senhaAtual || !novaSenha) { setMsg({ tipo: "erro", texto: "Preencha a senha atual e a nova senha." }); return; }
    if (novaSenha.length < 4) { setMsg({ tipo: "erro", texto: "A nova senha deve ter ao menos 4 caracteres." }); return; }
    if (novaSenha !== confirma) { setMsg({ tipo: "erro", texto: "A confirmação da nova senha não confere." }); return; }
    setSalvandoSenha(true);
    const r = await atualizarPerfil({ senhaAtual, novaSenha });
    setSalvandoSenha(false);
    if (r.ok) {
      setMsg({ tipo: "ok", texto: "Senha alterada com sucesso." });
      setSenhaAtual(""); setNovaSenha(""); setConfirma("");
    } else {
      setMsg({ tipo: "erro", texto: r.motivo ?? "Falha ao alterar a senha." });
    }
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-xs text-slate-400">Gerencie seus dados de acesso</p>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface-app p-6 scrollbar-hide dark:bg-slate-950">
        <div className="mx-auto max-w-xl space-y-6">
          {msg && (
            <p className={[
              "rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset",
              msg.tipo === "ok"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30"
                : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
            ].join(" ")}>
              {msg.texto}
            </p>
          )}

          {/* Dados de exibição */}
          <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Dados de exibição</h2>
            <div className="space-y-3">
              <Campo label="Nome de exibição">
                <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="Como seu nome aparece no sistema" />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="E-mail (login)">
                  <input readOnly value={atual.email} className={`${inputCls} cursor-default bg-slate-50 text-slate-500 dark:bg-slate-800/60`} />
                </Campo>
                <Campo label="Perfil">
                  <input readOnly value={PERFIL_META[atual.perfil].rotulo} className={`${inputCls} cursor-default bg-slate-50 text-slate-500 dark:bg-slate-800/60`} />
                </Campo>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={salvarNome} disabled={salvandoNome || nome.trim() === atual.nome || !nome.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {salvandoNome ? "Salvando…" : "Salvar nome"}
              </button>
            </div>
          </section>

          {/* Alterar senha */}
          <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Alterar senha</h2>
            <p className="mb-3 text-xs text-slate-400">Preencha apenas se quiser trocar a senha.</p>
            <div className="space-y-3">
              <Campo label="Senha atual">
                <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} autoComplete="current-password" className={inputCls} />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Nova senha">
                  <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" className={inputCls} />
                </Campo>
                <Campo label="Confirmar nova senha">
                  <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" className={inputCls} />
                </Campo>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={alterarSenha} disabled={salvandoSenha || !senhaAtual || !novaSenha} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {salvandoSenha ? "Alterando…" : "Alterar senha"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
