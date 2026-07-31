"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AssistenteProvider } from "@/lib/assistente-store";
import { Sidebar } from "@/components/layout/Sidebar";
import { TrocaSenhaObrigatoria } from "@/components/layout/TrocaSenhaObrigatoria";
import { AssistenteFlutuante } from "@/components/assistente/AssistenteFlutuante";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const { carregado, atual } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (carregado && !atual) router.replace("/login");
  }, [carregado, atual, router]);

  if (!carregado || !atual) {
    return <div className="grid h-screen place-items-center text-sm text-slate-400">Carregando…</div>;
  }

  return (
    <AssistenteProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      {/* Chatbot flutuante do Coordenador — presente em todas as telas. */}
      <AssistenteFlutuante />
      {/* Bloqueio de primeiro acesso: senha definida por terceiro. */}
      <TrocaSenhaObrigatoria />
    </AssistenteProvider>
  );
}
