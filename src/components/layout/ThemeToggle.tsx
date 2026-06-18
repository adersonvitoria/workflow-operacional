"use client";

import { useTheme } from "@/lib/theme";

export function ThemeToggle({ compacto = false }: { compacto?: boolean }) {
  const { tema, alternar } = useTheme();
  const escuro = tema === "dark";
  return (
    <button
      onClick={alternar}
      title={escuro ? "Tema claro" : "Tema escuro"}
      aria-label="Alternar tema"
      className={[
        "inline-flex items-center gap-2 rounded-lg text-sm font-medium transition",
        compacto
          ? "p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          : "border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      <span className="text-base leading-none">{escuro ? "☀" : "☾"}</span>
      {!compacto && <span>{escuro ? "Claro" : "Escuro"}</span>}
    </button>
  );
}
