"use client";

import { useEffect, useState } from "react";

// Lista de municípios do RS via API do IBGE (cacheada no módulo).
let cache: string[] | null = null;
let promessa: Promise<string[]> | null = null;

async function carregar(): Promise<string[]> {
  if (cache) return cache;
  if (!promessa) {
    promessa = fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/RS/municipios?orderBy=nome")
      .then((r) => r.json())
      .then((arr: { nome: string }[]) => {
        cache = arr.map((m) => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
        return cache;
      })
      .catch(() => {
        cache = [];
        return cache;
      });
  }
  return promessa;
}

/** Hook: lista de cidades do RS (vazia até carregar). */
export function useCidadesRS(): string[] {
  const [cidades, setCidades] = useState<string[]>(cache ?? []);
  useEffect(() => {
    if (!cache) void carregar().then(setCidades);
  }, []);
  return cidades;
}
