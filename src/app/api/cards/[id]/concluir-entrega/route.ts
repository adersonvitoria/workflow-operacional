import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeExecutarEtapa } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { entregaComprasCompleta } from "@/lib/routing";
import { rowToCard } from "@/lib/mappers";
import type { Card } from "@/types";

/**
 * Entrega (Compras, etapa final): concluída a entrega, o card volta para a
 * esteira de ORIGEM — Manutenção (Agendamento) ou Implantação (Monitoramento).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();

  const original = await prisma.card.findUnique({ where: { id: params.id } });
  if (!original) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });
  if (original.fluxo !== "COMPRAS" || original.etapa !== "ENTREGA") {
    return NextResponse.json({ erro: "Só cards na Entrega (Compras) concluem a entrega." }, { status: 422 });
  }
  if (!podeExecutarEtapa(s.perfil, "ENTREGA")) {
    return NextResponse.json({ erro: "Seu perfil não pode executar a ação desta etapa." }, { status: 403 });
  }
  // Gate: quando há itens, todos precisam da data de entrega registrada.
  const itens = (original.itensCompra as unknown as Card["itensCompra"]) ?? [];
  if (!entregaComprasCompleta({ itensCompra: itens })) {
    return NextResponse.json({ erro: "Registre a data de entrega de todos os itens antes de concluir." }, { status: 422 });
  }

  const paraImplantacao = original.origemCompras === "IMPLANTACAO";
  const destino = paraImplantacao
    ? ({ fluxo: "IMPLANTACAO", etapa: "MONITORAMENTO", responsavelSetor: "MONITORAMENTO" } as const)
    : ({ fluxo: "MANUTENCAO", etapa: "AGENDAMENTO", responsavelSetor: "ADMINISTRATIVO" } as const);
  const acao = paraImplantacao
    ? "Entrega concluída: card devolvido à Implantação (Monitoramento)"
    : "Entrega concluída: OS devolvida à Manutenção (Agendamento)";

  const hist = Array.isArray(original.historico) ? (original.historico as unknown[]) : [];
  const atualizado = await prisma.card.update({
    where: { id: original.id },
    data: {
      ...destino,
      historico: [
        ...hist,
        { id: `h${hist.length}`, data: new Date().toISOString(), setor: destino.responsavelSetor, autor: s.nome, acao, de: "ENTREGA", para: destino.etapa },
      ] as unknown as object[],
    },
  });

  return NextResponse.json({ card: rowToCard(atualizado) });
}
