"use client";

import { useState } from "react";

interface ItemNav {
  id: string;
  rotulo: string;
  icone: string; // emoji como placeholder (trocar por lucide-react em produção)
}

const NAV: ItemNav[] = [
  { id: "dashboard", rotulo: "Dashboard", icone: "▦" },
  { id: "implantacoes", rotulo: "Implantações", icone: "▤" },
  { id: "manutencoes", rotulo: "Manutenções", icone: "▣" },
  { id: "estoque", rotulo: "Estoque", icone: "▥" },
  { id: "config", rotulo: "Configurações", icone: "⚙" },
];

interface SidebarProps {
  ativo: string;
  onSelecionar: (id: string) => void;
}

/** Sidebar esquerdo retrátil. */
export function Sidebar({ ativo, onSelecionar }: SidebarProps) {
  const [recolhido, setRecolhido] = useState(false);

  return (
    <aside
      className={[
        "flex h-full flex-col bg-brand-navy text-slate-300 transition-all duration-200",
        recolhido ? "w-16" : "w-60",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-4 py-4">
        {!recolhido && (
          <span className="text-sm font-bold tracking-tight text-white">
            Workflow<span className="text-brand-600">OP</span>
          </span>
        )}
        <button
          onClick={() => setRecolhido((v) => !v)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Recolher menu"
        >
          {recolhido ? "»" : "«"}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {NAV.map((item) => {
          const selecionado = item.id === ativo;
          return (
            <button
              key={item.id}
              onClick={() => onSelecionar(item.id)}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                selecionado
                  ? "bg-brand-600 text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              ].join(" ")}
              title={item.rotulo}
            >
              <span className="text-base leading-none">{item.icone}</span>
              {!recolhido && <span>{item.rotulo}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
            AD
          </span>
          {!recolhido && (
            <div className="text-xs">
              <p className="font-medium text-white">Admin</p>
              <p className="text-slate-400">Supervisão</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
