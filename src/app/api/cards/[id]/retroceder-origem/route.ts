import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { rowToCard } from "@/lib/mappers";

/**
 * Retrocesso da esteira de COMPRAS para a esteira de ORIGEM (Coordenador).
 *
 * O card volta para a coluna de onde saiu:
 * - origem MANUTENÇÃO (padrão) → Aprovado (ORC_APROVADO);
 * - origem IMPLANTAÇÃO → Coordenação · Aprovação.
 *
 * De Aprovado, o Coordenador ainda pode retroceder para Orçamento pelo
 * caminho normal da Manutenção (retrocesso de raia via PATCH).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });
  if (card.fluxo !== "COMPRAS") {
    return NextResponse.json({ erro: "Só cards da esteira de Compras retrocedem para a esteira de origem." }, { status: 422 });
  }
  // Retrocesso entre esteiras é prerrogativa do Coordenador.
  if (s.perfil !== "COORDENADOR") {
    return NextResponse.json({ erro: "Somente o Coordenador pode retroceder o card para a esteira de origem." }, { status: 403 });
  }

  const paraImplantacao = card.origemCompras === "IMPLANTACAO";
  const destino = paraImplantacao
    ? ({ fluxo: "IMPLANTACAO", etapa: "COORDENACAO_APROVACAO", responsavelSetor: "COORDENACAO" } as const)
    : ({ fluxo: "MANUTENCAO", etapa: "ORC_APROVADO", responsavelSetor: "ADMINISTRATIVO" } as const);
  const acao = paraImplantacao
    ? "Retrocedido de Compras para a Implantação (Coordenação · Aprovação)"
    : "Retrocedido de Compras para a Manutenção (Aprovado)";

  const hist = Array.isArray(card.historico) ? (card.historico as unknown[]) : [];
  const atualizado = await prisma.card.update({
    where: { id: card.id },
    data: {
      ...destino,
      historico: [
        ...hist,
        { id: `h${hist.length}`, data: new Date().toISOString(), setor: destino.responsavelSetor, autor: s.nome, acao, de: card.etapa, para: destino.etapa },
      ] as unknown as object[],
    },
  });

  return NextResponse.json({ card: rowToCard(atualizado) });
}
