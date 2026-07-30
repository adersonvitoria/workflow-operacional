"use client";

import { useEffect } from "react";
import { useAssistente } from "@/lib/assistente-store";
import { useAuth } from "@/lib/auth";
import { podeUsarAssistente } from "@/lib/perfis";
import { ChatAssistente } from "@/components/assistente/ChatAssistente";

/**
 * Tela dedicada do Assistente GPSTec. A conversa é a MESMA do chatbot
 * flutuante (estado global no AssistenteProvider) — trocar de tela não perde
 * o histórico nem a resposta em andamento.
 */
export function AssistenteView() {
  const { atual } = useAuth();
  const pode = podeUsarAssistente(atual?.perfil);
  const { mensagens, limpar, marcarLido } = useAssistente();

  // Na tela dedicada as respostas são vistas na hora — zera o badge.
  useEffect(() => {
    marcarLido();
  }, [mensagens, marcarLido]);

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
          <button onClick={limpar} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Nova conversa
          </button>
        )}
      </header>
      <div className="flex min-h-0 flex-1 flex-col bg-surface-app dark:bg-slate-950">
        <ChatAssistente />
      </div>
    </>
  );
}
