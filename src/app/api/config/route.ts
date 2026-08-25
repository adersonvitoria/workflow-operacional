import { NextResponse } from "next/server";
import { obterSessao } from "@/lib/server-auth";
import { extracaoConfigurada } from "@/lib/extrair-orcamento";

/**
 * Capacidades do ambiente para a interface se adaptar. Hoje informa apenas se
 * a leitura de PDF por IA está disponível (OPENAI_API_KEY presente): sem ela,
 * as telas caem para o cadastro manual dos materiais — e voltam sozinhas ao
 * modo assistido quando a chave for reativada.
 */
export async function GET() {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ extracaoIA: extracaoConfigurada() });
}
