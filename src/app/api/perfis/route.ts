import { NextResponse } from "next/server";
import { obterSessao } from "@/lib/server-auth";
import { obterConfigPerfis } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";

/** Configuração efetiva de todos os perfis (padrões + overrides do banco). */
export async function GET() {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();
  return NextResponse.json({ config: obterConfigPerfis() });
}
