import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { rowToCard } from "@/lib/mappers";
import { horasParado, nivelSla } from "@/lib/flows";
import { rotuloEtapa } from "@/lib/routing";
import type { Card } from "@/types";

const encerrado = (s: Card["status"]) => s === "CONCLUIDO" || s === "FINALIZADO";

/** Monta o resumo dos problemas que a Coordenação precisa enxergar. */
function levantarProblemas(cards: Card[]) {
  const ativos = cards.filter((c) => c.fluxo === "IMPLANTACAO" && !encerrado(c.status));
  return ativos
    .map((c) => ({
      codigo: c.codigo,
      cliente: c.cliente.nome,
      etapa: rotuloEtapa(c.etapa),
      modalidade: c.modalidade ?? "—",
      prioridade: c.prioridade,
      horasParado: horasParado(c),
      sla: nivelSla(c),
      aguardando: c.status === "AGUARDANDO_APROVACAO",
      itensFaltantes: c.materiais.filter((m) => m.statusAlmox === "EM_COMPRAS" || m.statusAlmox === "PENDENTE").length,
    }))
    .filter((p) => p.sla !== "normal" || p.aguardando)
    .sort((a, b) => b.horasParado - a.horasParado);
}

function analiseHeuristica(problemas: ReturnType<typeof levantarProblemas>): string {
  if (problemas.length === 0) return "Nenhum problema crítico no momento — o fluxo está dentro do SLA. ✅";
  const roxo = problemas.filter((p) => p.sla === "roxo");
  const verm = problemas.filter((p) => p.sla === "vermelho");
  const amar = problemas.filter((p) => p.sla === "amarelo");
  const aprov = problemas.filter((p) => p.aguardando);
  const linhas: string[] = [];
  if (roxo.length) linhas.push(`🟣 **Crítico (+120h):** ${roxo.map((p) => `#${p.codigo} ${p.cliente} (${p.etapa}, ${p.horasParado}h)`).join("; ")}. Ação: escalar hoje e destravar a etapa pessoalmente.`);
  if (verm.length) linhas.push(`🔴 **Atrasado (96–120h):** ${verm.map((p) => `#${p.codigo} ${p.cliente} (${p.etapa})`).join("; ")}. Ação: cobrar o responsável da etapa e definir prazo.`);
  if (amar.length) linhas.push(`🟡 **Atenção (48–96h):** ${amar.length} card(s) se aproximando do limite. Ação: acompanhar para não estourar o SLA.`);
  if (aprov.length) linhas.push(`⏳ **Aguardando sua aprovação:** ${aprov.map((p) => `#${p.codigo} ${p.cliente}`).join("; ")}. Ação: revisar o escopo e aprovar/reprovar.`);
  return linhas.join("\n\n");
}

export async function POST() {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (s.perfil !== "COORDENADOR" && s.perfil !== "ADMINISTRATIVO") {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }

  const rows = await prisma.card.findMany({ where: { fluxo: "IMPLANTACAO" } });
  const problemas = levantarProblemas(rows.map(rowToCard));

  // Sem API key → análise heurística (a feature funciona mesmo sem IA).
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ analise: analiseHeuristica(problemas), fonte: "heuristica" });
  }

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system:
        "Você é um analista de operações de uma empresa de segurança eletrônica. " +
        "Recebe os cards problemáticos da esteira de implantação (parados além do SLA ou aguardando aprovação) " +
        "e recomenda ao Coordenador as ações a tomar. Responda em português do Brasil, objetivo, em tópicos priorizados " +
        "(do mais crítico ao menos), citando o cliente, a etapa e o tempo parado. No máximo 6 tópicos. Sem rodeios.",
      messages: [
        {
          role: "user",
          content:
            "Cards problemáticos (JSON):\n" +
            JSON.stringify(problemas, null, 2) +
            "\n\nGere a lista priorizada de ações para o Coordenador.",
        },
      ],
    });
    const texto = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();
    return NextResponse.json({ analise: texto || analiseHeuristica(problemas), fonte: "ia" });
  } catch {
    // Falha na IA (chave inválida, rate limit, etc.) → cai para a heurística.
    return NextResponse.json({ analise: analiseHeuristica(problemas), fonte: "heuristica" });
  }
}
