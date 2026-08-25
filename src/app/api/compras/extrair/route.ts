import { NextResponse } from "next/server";
import { obterSessao } from "@/lib/server-auth";
import { podeCriarCard } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { extracaoConfigurada, extrairOrcamentoPdf } from "@/lib/extrair-orcamento";
import { ehPdfValido, LIMITE_BASE64 } from "@/lib/pdf-seguro";

export const maxDuration = 60; // leitura de PDF pode levar alguns segundos

/**
 * Esteira de Compras · importa um orçamento (PDF padrão): extrai cliente,
 * nº/data do orçamento e a lista de itens. O resultado volta para o front,
 * onde o usuário REVISA e corrige antes de criar o card — a IA nunca cria direto.
 */
export async function POST(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();
  if (!podeCriarCard(s.perfil, "COMPRAS")) {
    return NextResponse.json({ erro: "Sem permissão para importar orçamentos." }, { status: 403 });
  }

  if (!extracaoConfigurada()) {
    return NextResponse.json(
      { erro: "Leitura por IA desativada neste ambiente — use o cadastro manual." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const pdfBase64: string | undefined = body.pdfBase64;
  if (!pdfBase64 || typeof pdfBase64 !== "string") {
    return NextResponse.json({ erro: "Envie o PDF em base64 no campo pdfBase64." }, { status: 400 });
  }
  // Limite prático do serverless (4,5 MB de request) — base64 infla ~33%.
  if (pdfBase64.length > LIMITE_BASE64) {
    return NextResponse.json({ erro: "PDF muito grande (máx. ~3 MB)." }, { status: 413 });
  }
  if (!ehPdfValido(pdfBase64)) {
    return NextResponse.json({ erro: "O arquivo enviado não é um PDF válido." }, { status: 415 });
  }

  try {
    const dados = await extrairOrcamentoPdf(pdfBase64);

    // Normaliza para o formato que o front espera (revisão antes de criar).
    const itens = (dados.itens ?? [])
      .filter((i) => i && typeof i.material === "string" && i.material.trim())
      .map((i, idx) => ({
        id: `ic-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        quantidade: Number.isFinite(Number(i.quantidade)) && Number(i.quantidade) > 0 ? Number(i.quantidade) : 1,
        material: i.material.trim(),
        setor: i.setor?.toString().trim() || undefined,
        statusPagamento: "PENDENTE" as const,
      }));

    return NextResponse.json({
      cliente: dados.cliente?.toString().trim() || "",
      numeroOrcamento: dados.numeroOrcamento?.toString().trim() || "",
      dataAprovacao: /^\d{4}-\d{2}-\d{2}$/.test(dados.dataAprovacao ?? "") ? dados.dataAprovacao : "",
      itens,
    });
  } catch (e) {
    const msg = e instanceof Error ? `Falha na IA: ${e.message}` : "Não foi possível ler o PDF.";
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
