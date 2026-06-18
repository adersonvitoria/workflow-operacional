"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
