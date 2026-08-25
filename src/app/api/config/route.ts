import { NextResponse } from "next/server";
import { obterSessao } from "@/lib/server-auth";
import { extracaoConfigurada, motivoIADesligada } from "@/lib/extrair-orcamento";

/**
 * Capacidades do ambiente para a interface se adaptar. Informa se a leitura
 * de PDF por IA está ativa — o PADRÃO é o cadastro manual, e a IA só liga
 * com IA_ATIVA=1 (+ OPENAI_API_KEY). `motivo` distingue "desligada por
 * configuração" de "ligada, mas sem chave".
 */
export async function GET() {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ extracaoIA: extracaoConfigurada(), motivo: motivoIADesligada() });
}
