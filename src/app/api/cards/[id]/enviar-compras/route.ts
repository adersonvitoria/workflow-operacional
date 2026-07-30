import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeExecutarEtapa } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { extracaoConfigurada, extrairOrcamentoPdf } from "@/lib/extrair-orcamento";
import { rowToCard } from "@/lib/mappers";

export const maxDuration = 60; // extração de itens do PDF pode levar alguns segundos

/**
 * Aprovado (Manutenção): o card muda de esteira — vai para COMPRAS, entrando
 * na coluna Separação (Almoxarifado). Na falta de itens, eles são extraídos
 * do PDF do orçamento anexado pela IA (melhor esforço).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();

  const original = await prisma.card.findUnique({ where: { id: params.id } });
  if (!original) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });
  if (original.fluxo !== "MANUTENCAO" || original.etapa !== "ORC_APROVADO") {
    return NextResponse.json({ erro: "Só cards Aprovados da Manutenção podem ser enviados às Compras." }, { status: 422 });
  }
  if (!podeExecutarEtapa(s.perfil, "ORC_APROVADO")) {
    return NextResponse.json({ erro: "Seu perfil não pode executar a ação desta etapa." }, { status: 403 });
  }

  const agora = new Date().toISOString();

  // Itens da esteira de Compras: os já existentes no card ou, na falta, os
  // extraídos do PDF anexado pela IA (melhor esforço — sem itens, edita depois).
  let itens = Array.isArray(original.itensCompra) ? (original.itensCompra as object[]) : [];
  if (itens.length === 0 && extracaoConfigurada()) {
    const anexo = await prisma.orcamentoPdf.findUnique({ where: { cardId: original.id } });
    if (anexo) {
      try {
        const extraido = await extrairOrcamentoPdf(anexo.dados);
        itens = (extraido.itens ?? [])
          .filter((i) => i && typeof i.material === "string" && i.material.trim())
          .map((i, idx) => ({
            id: `ic-${idx}-${agora.slice(-6)}`,
            quantidade: Number.isFinite(Number(i.quantidade)) && Number(i.quantidade) > 0 ? Number(i.quantidade) : 1,
            material: i.material.trim(),
            setor: i.setor?.toString().trim() || undefined,
            statusPagamento: "PENDENTE",
          }));
      } catch {
        // melhor esforço — segue sem itens
      }
    }
  }

  const hist = Array.isArray(original.historico) ? (original.historico as unknown[]) : [];
  const atualizado = await prisma.card.update({
    where: { id: original.id },
    data: {
      fluxo: "COMPRAS",
      etapa: "SEPARACAO",
      responsavelSetor: "ALMOXARIFADO",
      itensCompra: itens,
      historico: [
        ...hist,
        { id: `h${hist.length}`, data: agora, setor: "ALMOXARIFADO", autor: s.nome, acao: "Aprovado: card enviado à esteira de Compras (Separação)", de: "ORC_APROVADO", para: "SEPARACAO" },
      ] as unknown as object[],
    },
  });

  return NextResponse.json({ card: rowToCard(atualizado) });
}
