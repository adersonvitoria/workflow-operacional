"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { podeUsarAssistente } from "@/lib/perfis";

interface MensagemChat {
  papel: "usuario" | "assistente";
  texto: string;
}

const SUGESTOES = [
  "Quanto gastei em compras neste mês?",
  "Quais os gastos por centro de custo nos últimos 3 meses?",
  "Quantas visitas não cobradas tivemos neste mês?",
  "Qual o total faturado na competência atual?",
  "Quais OS estão paradas na esteira de Compras?",
];

/**
 * Assistente GPSTec — chat exclusivo do Coordenador que responde perguntas
 * sobre os dados da plataforma (gastos, faturamento, visitas, andamento).
 */
export function AssistenteView() {
  const { atual } = useAuth();
  const pode = podeUsarAssistente(atual?.perfil);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando]);

  async function enviar(pergunta?: string) {
    const q = (pergunta ?? texto).trim();
    if (!q || carregando) return;
    setErro(null);
    setTexto("");
    const historico: MensagemChat[] = [...mensagens, { papel: "usuario", texto: q }];
    setMensagens(historico);
    setCarregando(true);
    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ mensagens: historico }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro ?? "Falha ao consultar o assistente.");
      setMensagens((prev) => [...prev, { papel: "assistente", texto: json.resposta as string }]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao consultar o assistente.");
      // Devolve a pergunta ao campo para o usuário tentar de novo.
      setMensagens((prev) => prev.slice(0, -1));
      setTexto(q);
    } finally {
      setCarregando(false);
    }
  }

  if (!pode) {
    return (
      <div className="grid flex-1 place-items-center text-sm text-slate-400">
        O Assistente GPSTec é exclusivo do perfil Coordenador.
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Assistente GPSTec</h1>
          <p className="text-xs text-slate-400">Pergunte sobre os dados da plataforma: gastos, faturamento, visitas, andamento das esteiras</p>
        </div>
        {mensagens.length > 0 && (
          <button onClick={() => { setMensagens([]); setErro(null); }} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Nova conversa
          </button>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-surface-app dark:bg-slate-950">
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
          <div className="mx-auto max-w-3xl space-y-4">
            {mensagens.length === 0 && (
              <div className="mt-10 text-center">
                <p className="text-3xl">✦</p>
                <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">Como posso ajudar, Coordenação?</p>
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
                  Tenho acesso ao retrato atual das esteiras — posso somar gastos por centro de custo, faturamento por competência, visitas cobradas e não cobradas, e muito mais.
                </p>
                <div className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-2">
                  {SUGESTOES.map((s) => (
                    <button key={s} onClick={() => void enviar(s)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensagens.map((m, i) => (
              <div key={i} className={m.papel === "usuario" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.papel === "usuario"
                      ? "bg-brand text-white"
                      : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                  ].join(" ")}
                >
                  {m.texto}
                </div>
              </div>
            ))}

            {carregando && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
                  <span className="animate-pulse">Consultando os dados…</span>
                </div>
              </div>
            )}
            {erro && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30">
                ⚠ {erro}
              </p>
            )}
            <div ref={fimRef} />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          <form
            className="mx-auto flex max-w-3xl items-end gap-2"
            onSubmit={(e) => { e.preventDefault(); void enviar(); }}
          >
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(); }
              }}
              rows={Math.min(4, Math.max(1, texto.split("\n").length))}
              placeholder="Pergunte algo… (ex.: quanto gastei no CC 1023 nos últimos 3 meses?)"
              className="min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={carregando || !texto.trim()}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
