import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeExecutarEtapa } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { extracaoConfigurada, extrairOrcamentoPdf } from "@/lib/extrair-orcamento";
import { cabecalhosPdf, ehPdfValido, LIMITE_BASE64 } from "@/lib/pdf-seguro";

export const maxDuration = 60;

/**
 * Manutenção · coluna Orçamento: anexa o PDF do orçamento ao card (obrigatório
 * para enviar de Orçamento → Aguardando). O PDF é salvo na tabela OrcamentoPdf
 * e, com a IA configurada, o nº e o valor do orçamento são extraídos para
 * pré-preencher o gate — o usuário revisa antes de salvar.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();

  const card = await prisma.card.findUnique({ where: { id: params.id } });
  if (!card) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });
  if (card.fluxo !== "MANUTENCAO") {
    return NextResponse.json({ erro: "O anexo de orçamento é da esteira de Manutenção." }, { status: 422 });
  }
  // Quem executa a etapa atual pode anexar (Assistente 2 nas colunas de
  // orçamento; Coordenador sempre).
  if (!podeExecutarEtapa(s.perfil, card.etapa)) {
    return NextResponse.json({ erro: "Seu perfil não pode anexar o orçamento nesta etapa." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const pdfBase64: string | undefined = body.pdfBase64;
  const nome: string = (body.nome ?? "orcamento.pdf").toString().slice(0, 200);
  if (!pdfBase64 || typeof pdfBase64 !== "string") {
    return NextResponse.json({ erro: "Envie o PDF em base64 no campo pdfBase64." }, { status: 400 });
  }
  if (pdfBase64.length > LIMITE_BASE64) {
    return NextResponse.json({ erro: "PDF muito grande (máx. ~3 MB)." }, { status: 413 });
  }
  if (!ehPdfValido(pdfBase64)) {
    return NextResponse.json({ erro: "O arquivo enviado não é um PDF válido." }, { status: 415 });
  }

  // 1. Salva o anexo (upsert: reenviar substitui o anterior) + nome no card.
  await prisma.orcamentoPdf.upsert({
    where: { cardId: card.id },
    create: { cardId: card.id, nome, dados: pdfBase64 },
    update: { nome, dados: pdfBase64 },
  });
  const hist = Array.isArray(card.historico) ? (card.historico as unknown[]) : [];
  await prisma.card.update({
    where: { id: card.id },
    data: {
      orcamentoPdfNome: nome,
      historico: [
        ...hist,
        { id: `h${hist.length}`, data: new Date().toISOString(), setor: "ADMINISTRATIVO", autor: s.nome, acao: `Orçamento (PDF) anexado: ${nome}` },
      ] as unknown as object[],
    },
  });

  // 2. Extração (melhor esforço): sem IA configurada, o anexo vale mesmo assim.
  let extraido: { numeroOrcamento?: string; valorTotal?: number } = {};
  let avisoIA: string | undefined;
  if (extracaoConfigurada()) {
    try {
      const dados = await extrairOrcamentoPdf(pdfBase64);
      extraido = {
        numeroOrcamento: dados.numeroOrcamento?.toString().trim() || undefined,
        valorTotal: Number.isFinite(Number(dados.valorTotal)) && Number(dados.valorTotal) > 0 ? Number(dados.valorTotal) : undefined,
      };
    } catch (e) {
      avisoIA = `PDF anexado, mas a leitura por IA falhou: ${e instanceof Error ? e.message : "erro"}`;
    }
  } else {
    avisoIA = "PDF anexado. Leitura por IA indisponível (OPENAI_API_KEY não configurada).";
  }

  return NextResponse.json({ nome, extraido, avisoIA });
}

/** Baixa/abre o PDF do orçamento anexado ao card. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const anexo = await prisma.orcamentoPdf.findUnique({ where: { cardId: params.id } });
  if (!anexo) return NextResponse.json({ erro: "Nenhum orçamento anexado." }, { status: 404 });

  const bytes = Buffer.from(anexo.dados, "base64");
  return new NextResponse(bytes, { headers: cabecalhosPdf(anexo.nome) });
}
