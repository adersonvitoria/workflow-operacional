import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeUsarAssistente } from "@/lib/perfis";
import { consumir } from "@/lib/rate-limit";

export const maxDuration = 120; // folga p/ a IA responder sem derrubar a função

interface MensagemChat {
  papel: "usuario" | "assistente";
  texto: string;
}

/** Remove chaves nulas/vazias para reduzir o tamanho do contexto enviado à IA. */
function compacto<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

const dia = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);

/** Monta o retrato compacto da base (todos os cards) para o contexto da IA. */
async function montarDados() {
  const rows = await prisma.card.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((r) => {
    const man = (r.manutencao ?? {}) as Record<string, unknown>;
    const med = (r.medicao ?? {}) as Record<string, unknown>;
    const itens = (Array.isArray(r.itensCompra) ? r.itensCompra : []) as Record<string, unknown>[];
    return compacto({
      codigo: r.codigo,
      esteira: r.fluxo,
      etapa: r.etapa,
      status: r.status,
      cliente: r.clienteNome,
      tipoCliente: r.clienteTipo,
      cc: r.cc,
      cr: r.cr,
      conta: r.numeroConta,
      regiao: r.regiao ?? (man.regiao as string | undefined),
      abertura: dia(r.dataAbertura),
      conclusao: dia(r.dataConclusao),
      competenciaMedicao: med.competencia,
      valorMedicao: med.valorMedicao,
      visitaIsenta: med.visitaIsenta,
      chamado: (med.chamado as string | undefined) ?? r.chamado,
      numeroOrcamento: r.numeroOrcamento,
      valorTotal: r.valorTotal,
      valorMensal: r.valorMensal,
      valorLocacao: r.valorLocacao,
      modalidade: r.modalidade,
      tipoEntrada: man.tipo,
      visitaCobrada: man.visitaCobrada,
      valorVisita: man.valorVisita,
      dataVisita: man.dataVisita,
      tecnico: man.tecnico,
      complementar: r.complementar || undefined,
      itensCompra: itens.map((i) =>
        compacto({
          qtd: i.quantidade,
          material: i.material,
          setor: i.setor,
          tipoCusto: i.tipoCusto,
          centroCusto: i.centroCusto,
          fornecedor: i.fornecedor,
          dataEntrega: i.dataEntrega,
          pagamento: i.statusPagamento,
        }),
      ),
    });
  });
}

function promptSistema(dados: unknown, hoje: string): string {
  return `Você é o Assistente GPSTec, da plataforma Workflow Operacional da GPSTec-POA (segurança eletrônica).
Você responde EXCLUSIVAMENTE a usuários com perfil Coordenador, em português do Brasil, sobre os dados da plataforma.

HOJE é ${hoje}. Use essa data para interpretar períodos relativos ("neste mês", "últimos 3 meses", "último ano" etc.).

## Os dados

Abaixo está o retrato completo e atual do banco (todos os cards das 3 esteiras), em JSON compacto (campos vazios foram omitidos):
- esteira: IMPLANTACAO (projetos novos), MANUTENCAO (OS de manutenção) ou COMPRAS (orçamentos aprovados em compra de material).
- Valores em R$: valorTotal (orçamento/projeto), valorMensal, valorLocacao, valorVisita (visita cobrada), valorMedicao (valor faturado na Medição — quando existe, é o valor definitivo do card).
- competenciaMedicao ("MM/AAAA") é a competência de faturamento; sem ela, use o mês de "conclusao" para OS encerradas.
- Gasto/compra de material: cards da esteira COMPRAS (valorTotal do card). Os itens (itensCompra) têm centroCusto e tipoCusto, mas NÃO têm valor individual — o valor existe só no total do card. Ao somar gasto por centro de custo, atribua o valorTotal do card quando todos os itens forem do mesmo CC; se um card tiver itens de CCs diferentes, informe isso e trate o valor como não divisível.
- Visitas: visitaCobrada=true tem valorVisita; visita não cobrada (ou visitaIsenta=true) não gera receita.

## Regras de resposta

- Responda RÁPIDO e de forma CONCISA: vá direto ao número pedido.
- Ao somar valores, mostre a composição de forma enxuta: até 10 cards (código, cliente, valor); acima disso, os 10 maiores + "e mais N cards somando R$ X".
- Formate valores como R$ 1.234,56 e datas como DD/MM/AAAA.
- Se a informação não existir nos dados, diga claramente que não há registro — nunca invente.
- Listas com "-"; sem tabelas complexas; sem repetir a pergunta.

DADOS:
${JSON.stringify(dados)}`;
}

export async function POST(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!podeUsarAssistente(s.perfil)) {
    return NextResponse.json({ erro: "O Assistente GPSTec é exclusivo do perfil Coordenador." }, { status: 403 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ erro: "Assistente não configurado neste ambiente (OPENAI_API_KEY ausente)." }, { status: 503 });
  }
  // Custo de IA: no máximo 20 perguntas por usuário a cada 5 minutos.
  const limite = consumir(`assistente:${s.userId}`, 20, 5 * 60 * 1000);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: `Muitas perguntas seguidas. Tente novamente em ${limite.esperarSegundos}s.` },
      { status: 429, headers: { "Retry-After": String(limite.esperarSegundos) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { mensagens?: MensagemChat[] };
  const mensagens = (body.mensagens ?? []).slice(-20); // limita o histórico enviado
  if (!mensagens.length || mensagens[mensagens.length - 1].papel !== "usuario") {
    return NextResponse.json({ erro: "Envie a pergunta do usuário." }, { status: 400 });
  }

  const dados = await montarDados();
  const hoje = new Date().toISOString().slice(0, 10);
  const messages = [
    { role: "system", content: promptSistema(dados, hoje) },
    ...mensagens.map((m) => ({ role: m.papel === "usuario" ? "user" : "assistant", content: m.texto })),
  ];

  const chamar = (extras: Record<string, unknown>) =>
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? "gpt-5.5", messages, ...extras }),
    });

  // Latência: raciocínio no mínimo e resposta limitada. Se o modelo não
  // aceitar os parâmetros, repete a chamada sem eles.
  let res = await chamar({ reasoning_effort: process.env.OPENAI_REASONING ?? "low", max_completion_tokens: 1500 });
  let json = await res.json().catch(() => ({}));
  if (!res.ok && res.status === 400) {
    res = await chamar({});
    json = await res.json().catch(() => ({}));
  }
  if (!res.ok) {
    // Detalhe do provedor fica no log do servidor; o cliente recebe mensagem genérica.
    console.error("[assistente] falha na IA:", json?.error?.message ?? `HTTP ${res.status}`);
    return NextResponse.json({ erro: "O assistente está indisponível no momento. Tente novamente." }, { status: 502 });
  }
  const resposta: string = json?.choices?.[0]?.message?.content ?? "";
  if (!resposta.trim()) return NextResponse.json({ erro: "A IA não retornou resposta." }, { status: 502 });
  return NextResponse.json({ resposta });
}
