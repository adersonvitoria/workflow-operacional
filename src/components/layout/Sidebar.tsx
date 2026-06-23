"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PERFIL_META, podeGerarRelatorio, podeGerenciarItens, podeGerenciarUsuarios } from "@/lib/perfis";
import { ThemeToggle } from "./ThemeToggle";

interface ItemNav {
  href: string;
  rotulo: string;
  icone: string;
}

const NAV_BASE: ItemNav[] = [
  { href: "/dashboard", rotulo: "Dashboard", icone: "▦" },
  { href: "/implantacoes", rotulo: "Implantações", icone: "▤" },
  { href: "/manutencoes", rotulo: "Manutenções", icone: "▣" },
  { href: "/estoque", rotulo: "Estoque", icone: "▥" },
];

export function Sidebar() {
  const [recolhido, setRecolhido] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { atual, sair } = useAuth();

  const nav = [...NAV_BASE];
  if (podeGerenciarItens(atual?.perfil)) nav.push({ href: "/itens", rotulo: "Itens", icone: "◆" });
  if (podeGerarRelatorio(atual?.perfil)) nav.push({ href: "/relatorios", rotulo: "Relatórios", icone: "▧" });
  if (podeGerenciarUsuarios(atual?.perfil)) nav.push({ href: "/usuarios", rotulo: "Usuários", icone: "◍" });
  nav.push({ href: "/configuracoes", rotulo: "Configurações", icone: "⚙" });

  function logout() {
    sair();
    router.replace("/login");
  }

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
GPSTec<span className="text-brand-600">-POA</span>
          </span>
        )}
        <button onClick={() => setRecolhido((v) => !v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Recolher menu">
          {recolhido ? "»" : "«"}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {nav.map((item) => {
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

      <div className="space-y-2 border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2">
          <ThemeToggle compacto />
          {!recolhido && (
            <button onClick={logout} className="flex-1 rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white">
              Sair
            </button>
          )}
        </div>

        {atual && (
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {iniciais(atual.nome)}
            </span>
            {!recolhido && (
              <div className="min-w-0 text-xs">
                <p className="truncate font-medium text-white">{atual.nome}</p>
                <p className="truncate text-slate-400">{PERFIL_META[atual.perfil].rotulo}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
