"use client";

import { usePathname } from "next/navigation";
import { useAssistente } from "@/lib/assistente-store";
import { useAuth } from "@/lib/auth";
import { podeUsarAssistente } from "@/lib/perfis";
import { ChatAssistente } from "./ChatAssistente";

/**
 * Assistente GPSTec flutuante — disponível em TODAS as telas do painel para o
 * Coordenador, como um chatbot: botão minimizado no canto (com badge quando
 * chega resposta) que expande para a janela de conversa. A conversa é global
 * (AssistenteProvider), então trocar de tela não perde o histórico nem a
 * resposta que estiver sendo gerada.
 */
export function AssistenteFlutuante() {
  const { atual } = useAuth();
  const pathname = usePathname();
  const { aberto, setAberto, naoLidas, mensagens, limpar } = useAssistente();

  if (!podeUsarAssistente(atual?.perfil)) return null;
  // Na tela dedicada o chat já ocupa a página inteira — dispensa o flutuante.
  if (pathname === "/assistente" || pathname.startsWith("/assistente/")) return null;

  return (
    <>
      {aberto && (
        <div className="fixed bottom-20 right-5 z-[80] flex h-[min(560px,calc(100vh-7rem))] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface-app shadow-2xl dark:border-slate-700 dark:bg-slate-950">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-sm text-white">✦</span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Assistente GPSTec</p>
                <p className="text-[10px] text-slate-400">Dados da plataforma em tempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {mensagens.length > 0 && (
                <button onClick={limpar} className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" title="Nova conversa">
                  Limpar
                </button>
              )}
              <button onClick={() => setAberto(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Minimizar" title="Minimizar">
                —
              </button>
            </div>
          </header>
          <ChatAssistente compacto />
        </div>
      )}

      <button
        onClick={() => setAberto(!aberto)}
        className="fixed bottom-5 right-5 z-[80] grid h-12 w-12 place-items-center rounded-full bg-brand text-xl text-white shadow-lg transition hover:bg-brand-700"
        aria-label={aberto ? "Minimizar Assistente GPSTec" : "Abrir Assistente GPSTec"}
        title="Assistente GPSTec"
      >
        {aberto ? "✕" : "✦"}
        {!aberto && naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
            {naoLidas}
          </span>
        )}
      </button>
    </>
  );
}
