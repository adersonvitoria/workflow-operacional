"use client";

import { useEffect, useRef, useState } from "react";
import { useAssistente } from "@/lib/assistente-store";
import { useExtracaoIA } from "@/lib/config-ia";

const SUGESTOES = [
  "Quanto gastei em compras neste mês?",
  "Quais os gastos por centro de custo nos últimos 3 meses?",
  "Quantas visitas não cobradas tivemos neste mês?",
  "Qual o total faturado na competência atual?",
  "Quais OS estão paradas na esteira de Compras?",
];

/**
 * Corpo do chat do Assistente GPSTec (lista de mensagens + campo de envio).
 * Usado tanto na tela /assistente quanto no painel flutuante — o estado da
 * conversa vem do AssistenteProvider (global, sobrevive à troca de telas).
 */
export function ChatAssistente({ compacto = false }: { compacto?: boolean }) {
  const { mensagens, carregando, erro, enviar } = useAssistente();
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  // O assistente usa a mesma chave de IA da leitura de PDF.
  const iaAtiva = useExtracaoIA();

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando]);

  function submeter(pergunta?: string) {
    const q = (pergunta ?? texto).trim();
    if (!q || carregando) return;
    setTexto("");
    void enviar(q);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={["flex-1 overflow-y-auto scrollbar-hide", compacto ? "px-3 py-3" : "px-6 py-4"].join(" ")}>
        <div className={["space-y-3", compacto ? "" : "mx-auto max-w-3xl"].join(" ")}>
          {mensagens.length === 0 && iaAtiva === false && (
            <div className={compacto ? "mt-4 text-center" : "mt-10 text-center"}>
              <p className="text-3xl">✦</p>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">Assistente temporariamente indisponível</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
                A integração de IA está desativada neste ambiente. Assim que a chave for reativada, o assistente volta a responder — nada precisa ser reconfigurado.
              </p>
            </div>
          )}
          {mensagens.length === 0 && iaAtiva !== false && (
            <div className={compacto ? "mt-4 text-center" : "mt-10 text-center"}>
              <p className="text-3xl">✦</p>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">Como posso ajudar, Coordenação?</p>
              {!compacto && (
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
                  Tenho acesso ao retrato atual das esteiras — posso somar gastos por centro de custo, faturamento por competência, visitas cobradas e não cobradas, e muito mais.
                </p>
              )}
              <div className={["mx-auto mt-4 flex flex-wrap justify-center gap-2", compacto ? "" : "max-w-xl"].join(" ")}>
                {SUGESTOES.slice(0, compacto ? 3 : SUGESTOES.length).map((s) => (
                  <button key={s} onClick={() => submeter(s)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
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
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
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
              <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
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

      <div className={["border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900", compacto ? "px-3 py-2" : "px-6 py-3"].join(" ")}>
        <form
          className={["flex items-end gap-2", compacto ? "" : "mx-auto max-w-3xl"].join(" ")}
          onSubmit={(e) => { e.preventDefault(); submeter(); }}
        >
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submeter(); }
            }}
            rows={Math.min(4, Math.max(1, texto.split("\n").length))}
            placeholder={compacto ? "Pergunte algo…" : "Pergunte algo… (ex.: quanto gastei no CC 1023 nos últimos 3 meses?)"}
            className="min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={carregando || !texto.trim()}
            className="rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
