"use client";

import { useMemo, useState } from "react";
import { useTecnicos, type TipoTecnico } from "@/lib/tecnicos-store";

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

interface Props {
  tipo: TipoTecnico;
  titulo: string;
  subtitulo: string;
  rotuloSingular: string; // ex.: "técnico" / "prestador"
}

export function TecnicosView({ tipo, titulo, subtitulo, rotuloSingular }: Props) {
  const { tecnicos, criar, atualizar, remover } = useTecnicos();
  const [novo, setNovo] = useState("");
  const [busca, setBusca] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const arr = tecnicos.filter((t) => t.tipo === tipo && (!q || t.nome.toLowerCase().includes(q)));
    return [...arr].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [tecnicos, tipo, busca]);
  const total = useMemo(() => tecnicos.filter((t) => t.tipo === tipo).length, [tecnicos, tipo]);

  async function adicionar() {
    setMsg(null);
    const nome = novo.trim();
    if (!nome) { setMsg({ tipo: "erro", texto: `Informe o nome do ${rotuloSingular}.` }); return; }
    setOcupado(true);
    const r = await criar(nome, tipo);
    setOcupado(false);
    if (r.ok) { setNovo(""); setMsg({ tipo: "ok", texto: "Cadastrado." }); }
    else setMsg({ tipo: "erro", texto: r.motivo ?? "Falha ao cadastrar." });
  }

  async function salvarEdicao(id: string) {
    const nome = editNome.trim();
    if (!nome) return;
    await atualizar(id, { nome });
    setEditId(null);
    setMsg({ tipo: "ok", texto: "Atualizado." });
  }

  async function excluir(id: string, nome: string) {
    if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    await remover(id);
    setMsg({ tipo: "ok", texto: "Excluído." });
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{titulo}</h1>
        <p className="text-xs text-slate-400">{subtitulo}</p>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface-app p-6 scrollbar-hide dark:bg-slate-950">
        <div className="mx-auto max-w-2xl space-y-5">
          {msg && (
            <p className={["rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset", msg.tipo === "ok" ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30" : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30"].join(" ")}>{msg.texto}</p>
          )}

          <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Novo {rotuloSingular}</h2>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Nome</span>
                <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && adicionar()} placeholder={`Nome completo do ${rotuloSingular}`} className={inputCls} />
              </div>
              <button onClick={adicionar} disabled={ocupado} className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{ocupado ? "Salvando…" : "Cadastrar"}</button>
            </div>
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Cadastrados ({total})</h2>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar…" className="w-44 rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            </div>
            {lista.length === 0 ? (
              <p className="text-sm text-slate-400">{total === 0 ? "Nenhum cadastro ainda." : "Nenhum encontrado."}</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {lista.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    {editId === t.id ? (
                      <>
                        <input autoFocus value={editNome} onChange={(e) => setEditNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvarEdicao(t.id)} className={`${inputCls} flex-1`} />
                        <button onClick={() => salvarEdicao(t.id)} className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Salvar</button>
                        <button onClick={() => setEditId(null)} className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-2 truncate text-slate-700 dark:text-slate-200">
                          {!t.ativo && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">inativo</span>}
                          {t.nome}
                          {t.tipo === "TERCEIRO" && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">Terceiro</span>}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          <button onClick={() => atualizar(t.id, { ativo: !t.ativo })} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">{t.ativo ? "Desativar" : "Reativar"}</button>
                          <button onClick={() => { setEditId(t.id); setEditNome(t.nome); setMsg(null); }} className="rounded-lg px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10">Editar</button>
                          <button onClick={() => excluir(t.id, t.nome)} className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15">Excluir</button>
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
