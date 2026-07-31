import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeExecutarEtapa } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { ehPdfValido, LIMITE_BASE64 } from "@/lib/pdf-seguro";

/**
 * Anexos PDF avulsos do card (vários por card) — usados no Comercial
 * (Implantação) e no Pedido ao Fornecedor (Compras). Quem executa a etapa
 * atual pode anexar; qualquer usuário autenticado pode listar/abrir.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();

  const card = await prisma.card.findUnique({ where: { id: id } });
  if (!card) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });
  if (!podeExecutarEtapa(s.perfil, card.etapa, card.modalidade ?? undefined)) {
    return NextResponse.json({ erro: "Seu perfil não pode anexar PDF nesta etapa." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const pdfBase64: string | undefined = body.pdfBase64;
  const nome: string = (body.nome ?? "anexo.pdf").toString().slice(0, 200);
  if (!pdfBase64 || typeof pdfBase64 !== "string") {
    return NextResponse.json({ erro: "Envie o PDF em base64 no campo pdfBase64." }, { status: 400 });
  }
  if (pdfBase64.length > LIMITE_BASE64) {
    return NextResponse.json({ erro: "PDF muito grande (máx. ~3 MB)." }, { status: 413 });
  }
  // O conteúdo precisa ser mesmo um PDF (assinatura), não só o tipo declarado.
  if (!ehPdfValido(pdfBase64)) {
    return NextResponse.json({ erro: "O arquivo enviado não é um PDF válido." }, { status: 415 });
  }

  const anexo = await prisma.anexoPdf.create({
    data: { cardId: card.id, nome, etapa: card.etapa, dados: pdfBase64, autor: s.nome },
  });
  const hist = Array.isArray(card.historico) ? (card.historico as unknown[]) : [];
  await prisma.card.update({
    where: { id: card.id },
    data: {
      historico: [
        ...hist,
        { id: `h${hist.length}`, data: new Date().toISOString(), setor: card.responsavelSetor ?? "ADMINISTRATIVO", autor: s.nome, acao: `PDF anexado: ${nome}` },
      ] as unknown as object[],
    },
  });

  return NextResponse.json({ anexo: { id: anexo.id, nome: anexo.nome, etapa: anexo.etapa, autor: anexo.autor, createdAt: anexo.createdAt.toISOString() } }, { status: 201 });
}

/** Lista os anexos do card (sem o conteúdo — leve para o painel). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const anexos = await prisma.anexoPdf.findMany({
    where: { cardId: id },
    select: { id: true, nome: true, etapa: true, autor: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ anexos });
}
