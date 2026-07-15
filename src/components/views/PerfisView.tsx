"use client";

import { useEffect, useMemo, useState } from "react";
import { usePerfis } from "@/lib/perfis-client";
import { PERFIL_META, PERFIS, type Capacidades, type Perfil, type PerfilConfig } from "@/lib/perfis";
import { rotuloEtapa } from "@/lib/routing";
import type { EtapaId } from "@/types";

const CAPS: { key: keyof Capacidades; rotulo: string }[] = [
  { key: "criarImplantacao", rotulo: "Criar cards de Implantação" },
  { key: "criarManutencao", rotulo: "Criar cards de Manutenção" },
  { key: "editarCard", rotulo: "Editar dados do card" },
  { key: "excluirCard", rotulo: "Excluir card" },
  { key: "gerarRelatorio", rotulo: "Gerar relatórios" },
  { key: "gerenciarItens", rotulo: "Gerenciar itens" },
  { key: "gerenciarUsuarios", rotulo: "Gerenciar usuários" },
];

const GRUPOS_ETAPA: { titulo: string; etapas: EtapaId[] }[] = [
  { titulo: "Implantação", etapas: ["COMERCIAL", "COORDENACAO_APROVACAO", "ALMOXARIFADO", "SUPRIMENTOS", "MONITORAMENTO", "TECNICA", "CHEQUE_MONITORAMENTO", "COORDENACAO_AUDITORIA"] },
  { titulo: "Manutenção", etapas: ["AGENDAMENTO", "ROTINA", "CHEQUE", "ORCAMENTO", "ORC_AGUARDANDO", "ORC_NAO_APROVADO", "ORC_APROVADO", "SEPARACAO", "COMPRA"] },
  { titulo: "Medição / Encerramento (ambas)", etapas: ["MEDICAO", "ENCERRADOS"] },
];

const EDITAVEIS = PERFIS.filter((p) => p !== "COORDENADOR");

export function PerfisView() {
  const { config, salvar, restaurar } = usePerfis();
  const [sel, setSel] = useState<Perfil>(EDITAVEIS[0]);
  const [draft, setDraft] = useState<PerfilConfig>(config[sel]);
  const [acoesTexto, setAcoesTexto] = useState<string>(config[sel].acoes.join("\n"));
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Sincroniza o rascunho ao trocar de perfil ou quando a config recarrega.
  useEffect(() => {
    setDraft(config[sel]);
    setAcoesTexto(config[sel].acoes.join("\n"));
    setMsg(null);
  }, [sel, config]);

  const etapasSet = useMemo(() => new Set(draft.etapas), [draft.etapas]);

  function toggleEtapa(id: EtapaId) {
    setDraft((d) => {
      const s = new Set(d.etapas);
      if (s.has(id)) s.delete(id); else s.add(id);
      return { ...d, etapas: [...s] };
    });
  }
  function toggleCap(key: keyof Capacidades) {
    setDraft((d) => ({ ...d, capacidades: { ...d.capacidades, [key]: !d.capacidades[key] } }));
  }

  async function onSalvar() {
    setMsg(null);
    setSalvando(true);
    const acoes = acoesTexto.split("\n").map((s) => s.trim()).filter(Boolean);
    const r = await salvar(sel, { ...draft, acoes });
    setSalvando(false);
    setMsg(r.ok ? { tipo: "ok", texto: `Permissões de ${PERFIL_META[sel].rotulo} salvas.` } : { tipo: "erro", texto: r.motivo ?? "Falha ao salvar." });
  }

  async function onRestaurar() {
    if (!window.confirm(`Restaurar as permissões padrão de ${PERFIL_META[sel].rotulo}?`)) return;
    setMsg(null);
    setSalvando(true);
    const r = await restaurar(sel);
    setSalvando(false);
    setMsg(r.ok ? { tipo: "ok", texto: `Permissões de ${PERFIL_META[sel].rotulo} restauradas ao padrão.` } : { tipo: "erro", texto: r.motivo ?? "Falha ao restaurar." });
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Perfis e permissões</h1>
        <p className="text-xs text-slate-400">Defina o que cada perfil pode fazer. O Coordenador tem acesso total.</p>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Lista de perfis */}
        <aside className="w-56 shrink-0 space-y-1 overflow-y-auto border-r border-slate-200 bg-white p-2 scrollbar-hide dark:border-slate-800 dark:bg-slate-900">
          {EDITAVEIS.map((p) => (
            <button
              key={p}
              onClick={() => setSel(p)}
              className={["flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition", sel === p ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"].join(" ")}
            >
              <span className="truncate">{PERFIL_META[p].rotulo}</span>
            </button>
          ))}
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
            <strong>Coordenador</strong>: acesso total (não editável).
          </div>
        </aside>

        {/* Editor do perfil selecionado */}
        <div className="flex-1 overflow-y-auto bg-surface-app p-6 scrollbar-hide dark:bg-slate-950">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${PERFIL_META[sel].classe}`}>{PERFIL_META[sel].rotulo}</span>
                <p className="mt-1 text-xs text-slate-400">{PERFIL_META[sel].descricao}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={onRestaurar} disabled={salvando} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  Restaurar padrão
                </button>
                <button onClick={onSalvar} disabled={salvando} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                  {salvando ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>

            {msg && (
              <p className={["rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset", msg.tipo === "ok" ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30" : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30"].join(" ")}>
                {msg.texto}
              </p>
            )}

            {/* Capacidades */}
            <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Capacidades</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CAPS.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={!!draft.capacidades[c.key]} onChange={() => toggleCap(c.key)} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
                    {c.rotulo}
                  </label>
                ))}
              </div>
            </section>

            {/* Etapas */}
            <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Etapas que o perfil executa</h2>
              <p className="mb-3 text-xs text-slate-400">Onde o perfil pode avançar/agir e editar os cards.</p>
              <div className="space-y-4">
                {GRUPOS_ETAPA.map((g) => (
                  <div key={g.titulo}>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.titulo}</h3>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {g.etapas.map((e) => (
                        <label key={e} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                          <input type="checkbox" checked={etapasSet.has(e)} onChange={() => toggleEtapa(e)} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
                          {rotuloEtapa(e)}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Ações */}
            <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Ações (descrição)</h2>
              <p className="mb-3 text-xs text-slate-400">Uma ação por linha. Aparece na credencial do perfil.</p>
              <textarea
                rows={5}
                value={acoesTexto}
                onChange={(e) => setAcoesTexto(e.target.value)}
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
