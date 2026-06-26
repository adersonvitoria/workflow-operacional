"use client";

import { useState } from "react";
import type { Tecnico } from "@/lib/tecnicos-store";

/**
 * Campo de pessoa (Técnico/Auxiliar) com busca: lista técnicos e prestadores
 * (terceiros) cadastrados — terceiros aparecem com o selo "Terceiro". Permite
 * digitar para filtrar e selecionar; guarda o nome.
 */
export function ComboPessoa({ value, onChange, opcoes, placeholder, className }: {
  value: string;
  onChange: (v: string) => void;
  opcoes: Tecnico[];
  placeholder?: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const q = (value ?? "").trim().toLowerCase();
  const filtradas = q ? opcoes.filter((o) => o.nome.toLowerCase().includes(q)) : opcoes;

  return (
    <div className="relative">
      <input
        value={value ?? ""}
        onChange={(e) => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {aberto && filtradas.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {filtradas.slice(0, 60).map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(o.nome); setAberto(false); }}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <span className="truncate">{o.nome}</span>
                {o.tipo === "TERCEIRO" && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">Terceiro</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
