"use client";

import { useEffect, useState } from "react";

/** Cache do processo: a resposta não muda enquanto a aba estiver aberta. */
let cache: boolean | null = null;
let emVoo: Promise<boolean> | null = null;

async function buscar(): Promise<boolean> {
  if (cache !== null) return cache;
  if (!emVoo) {
    emVoo = fetch("/api/config", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { extracaoIA: false }))
      .then((j) => {
        cache = !!j.extracaoIA;
        return cache;
      })
      .catch(() => false)
      .finally(() => { emVoo = null; });
  }
  return emVoo;
}

/**
 * True quando a leitura de PDF por IA está disponível no ambiente; false
 * quando o cadastro é manual. `undefined` enquanto carrega — a interface não
 * deve prometer a leitura automática antes de saber.
 */
export function useExtracaoIA(): boolean | undefined {
  const [ativa, setAtiva] = useState<boolean | undefined>(cache ?? undefined);
  useEffect(() => {
    let vivo = true;
    void buscar().then((v) => { if (vivo) setAtiva(v); });
    return () => { vivo = false; };
  }, []);
  return ativa;
}
