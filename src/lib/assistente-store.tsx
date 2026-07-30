"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export interface MensagemAssistente {
  papel: "usuario" | "assistente";
  texto: string;
}

interface AssistenteContextValue {
  mensagens: MensagemAssistente[];
  carregando: boolean;
  erro: string | null;
  /** Painel flutuante expandido? */
  aberto: boolean;
  setAberto: (v: boolean) => void;
  /** Respostas recebidas enquanto o chat estava fechado (badge de notificação). */
  naoLidas: number;
  marcarLido: () => void;
  enviar: (texto: string) => Promise<void>;
  limpar: () => void;
}

const AssistenteContext = createContext<AssistenteContextValue | null>(null);

/**
 * Estado GLOBAL do Assistente GPSTec: vive no layout do painel, então a
 * conversa (e uma resposta em andamento) sobrevive à troca de telas. Quando a
 * resposta chega com o chat fechado/minimizado, conta como não lida (badge).
 */
export function AssistenteProvider({ children }: { children: React.ReactNode }) {
  const [mensagens, setMensagens] = useState<MensagemAssistente[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAbertoState] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const abertoRef = useRef(false);

  const setAberto = useCallback((v: boolean) => {
    abertoRef.current = v;
    setAbertoState(v);
    if (v) setNaoLidas(0);
  }, []);

  const marcarLido = useCallback(() => setNaoLidas(0), []);

  const enviar = useCallback(async (texto: string) => {
    const q = texto.trim();
    if (!q) return;
    setErro(null);
    setCarregando(true);
    let historico: MensagemAssistente[] = [];
    setMensagens((prev) => {
      historico = [...prev, { papel: "usuario", texto: q }];
      return historico;
    });
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
      // Chegou resposta com o chat fechado → notifica (badge no botão flutuante).
      if (!abertoRef.current) setNaoLidas((n) => n + 1);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao consultar o assistente.");
    } finally {
      setCarregando(false);
    }
  }, []);

  const limpar = useCallback(() => {
    setMensagens([]);
    setErro(null);
    setNaoLidas(0);
  }, []);

  const value = useMemo<AssistenteContextValue>(
    () => ({ mensagens, carregando, erro, aberto, setAberto, naoLidas, marcarLido, enviar, limpar }),
    [mensagens, carregando, erro, aberto, setAberto, naoLidas, marcarLido, enviar, limpar],
  );

  return <AssistenteContext.Provider value={value}>{children}</AssistenteContext.Provider>;
}

export function useAssistente(): AssistenteContextValue {
  const ctx = useContext(AssistenteContext);
  if (!ctx) throw new Error("useAssistente deve ser usado dentro de <AssistenteProvider>");
  return ctx;
}
