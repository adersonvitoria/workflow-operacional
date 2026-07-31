import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeExecutarEtapa } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { cabecalhosPdf } from "@/lib/pdf-seguro";

/** Baixa/abre um anexo PDF do card. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; anexoId: string }> }) {
  const { id, anexoId } = await params;
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const anexo = await prisma.anexoPdf.findUnique({ where: { id: anexoId } });
  if (!anexo || anexo.cardId !== id) {
    return NextResponse.json({ erro: "Anexo não encontrado." }, { status: 404 });
  }
  const bytes = Buffer.from(anexo.dados, "base64");
  return new NextResponse(bytes, { headers: cabecalhosPdf(anexo.nome) });
}

/** Remove um anexo (quem executa a etapa atual do card). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; anexoId: string }> }) {
  const { id, anexoId } = await params;
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();

  const anexo = await prisma.anexoPdf.findUnique({ where: { id: anexoId } });
  if (!anexo || anexo.cardId !== id) {
    return NextResponse.json({ erro: "Anexo não encontrado." }, { status: 404 });
  }
  const card = await prisma.card.findUnique({ where: { id: id } });
  if (!card) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });
  if (!podeExecutarEtapa(s.perfil, card.etapa, card.modalidade ?? undefined)) {
    return NextResponse.json({ erro: "Seu perfil não pode remover anexos nesta etapa." }, { status: 403 });
  }
  await prisma.anexoPdf.delete({ where: { id: anexo.id } });
  return NextResponse.json({ ok: true });
}
