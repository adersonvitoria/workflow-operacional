import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeExecutarEtapa } from "@/lib/perfis";
import { podeAvancar } from "@/lib/routing";
import { rowToCard } from "@/lib/mappers";
import type { CardStatus, EtapaId, Setor } from "@/types";

const SETOR_DA_ETAPA: Record<string, Setor> = {
  COMERCIAL: "COMERCIAL",
  COORDENACAO_APROVACAO: "COORDENACAO",
  ALMOXARIFADO: "ALMOXARIFADO",
  SUPRIMENTOS: "COMPRAS",
  MONITORAMENTO: "MONITORAMENTO",
  TECNICA: "TECNICA",
  COORDENACAO_AUDITORIA: "COORDENACAO",
  MEDICAO: "MEDICAO",
};

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const row = await prisma.card.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });

  const card = rowToCard(row);

  // RBAC: só o setor dono da etapa (ou ADMINISTRATIVO) pode avançar.
  if (!podeExecutarEtapa(s.perfil, card.etapa, card.modalidade)) {
    return NextResponse.json({ erro: "Seu perfil não pode executar esta etapa." }, { status: 403 });
  }
  // Gate: regra de negócio validada no servidor.
  const r = podeAvancar(card);
  if (!r.ok || !r.proxima) {
    return NextResponse.json({ erro: r.motivo ?? "Não é possível avançar." }, { status: 422 });
  }

  const destino = r.proxima as EtapaId;
  // Ao chegar em Medição o card fica EM_ANDAMENTO (em medição); só vira
  // FINALIZADO quando o setor de Medição registra os dados.
  const status: CardStatus = "EM_ANDAMENTO";
  const historico = [
    ...card.historico,
    { id: `h${card.historico.length}`, data: new Date().toISOString(), setor: SETOR_DA_ETAPA[destino] ?? "TECNICA", autor: s.nome, acao: `Avançou para ${destino}`, de: card.etapa, para: destino },
  ];

  const atualizado = await prisma.card.update({
    where: { id: params.id },
    data: {
      etapa: destino,
      status,
      responsavelSetor: SETOR_DA_ETAPA[destino] ?? null,
      responsavelPessoa: null,
      historico: historico as unknown as object[],
    },
  });
  return NextResponse.json({ card: rowToCard(atualizado) });
}
