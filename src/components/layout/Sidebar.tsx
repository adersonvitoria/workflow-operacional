"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ItemNav {
  href: string;
  rotulo: string;
  icone: string; // placeholder (trocar por lucide-react em produção)
}

const NAV: ItemNav[] = [
  { href: "/dashboard", rotulo: "Dashboard", icone: "▦" },
  { href: "/implantacoes", rotulo: "Implantações", icone: "▤" },
  { href: "/manutencoes", rotulo: "Manutenções", icone: "▣" },
  { href: "/estoque", rotulo: "Estoque", icone: "▥" },
];

/** Sidebar esquerdo retrátil, com navegação por rota. */
export function Sidebar() {
  const [recolhido, setRecolhido] = useState(false);
  const pathname = usePathname();

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
          const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                ativo ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
              ].join(" ")}
              title={item.rotulo}
            >
              <span className="text-base leading-none">{item.icone}</span>
              {!recolhido && <span>{item.rotulo}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">AD</span>
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
