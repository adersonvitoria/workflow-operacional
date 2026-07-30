import { NextResponse } from "next/server";
import { obterSessao } from "@/lib/server-auth";
import { podeCriarCard } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";

export const maxDuration = 60; // leitura de PDF pode levar alguns segundos

/**
 * Extrai os dados de um orçamento (PDF padrão) para alimentar a esteira de
 * Compras: cliente, nº do orçamento, data de aprovação e a lista de itens
 * (quantidade, material, setor). O resultado volta para o front, onde o
 * usuário REVISA e corrige antes de criar o card — a IA nunca cria direto.
 *
 * Provedor: OpenAI (GPT-5.5, escolha do cliente). Modelo configurável via
 * OPENAI_MODEL (default "gpt-5.5"); requer OPENAI_API_KEY no ambiente.
 */
const PROMPT = `Você está lendo o PDF de um orçamento aprovado de uma empresa de segurança eletrônica.
Extraia EXATAMENTE o JSON abaixo, sem nenhum texto antes ou depois, sem cercas de código:

{
  "cliente": "nome do cliente",
  "numeroOrcamento": "número do orçamento se houver, senão null",
  "dataAprovacao": "data de aprovação/emissão no formato YYYY-MM-DD se houver, senão null",
  "itens": [
    { "quantidade": 1, "material": "descrição do item", "setor": "setor de uso se indicado, senão null" }
  ]
}

Regras:
- Liste TODOS os itens/materiais do orçamento, um por linha da tabela.
- "quantidade" é número (se vier "2 un", use 2; se não houver, use 1).
- Não invente valores: campo ausente no PDF vira null.
- Responda somente com o JSON.`;

interface ItemExtraido {
  quantidade: number;
  material: string;
  setor?: string | null;
}
interface ResultadoExtracao {
  cliente?: string | null;
  numeroOrcamento?: string | null;
  dataAprovacao?: string | null;
  itens?: ItemExtraido[];
}

/** Remove cercas de código e extrai o primeiro objeto JSON do texto. */
function parseJson(texto: string): ResultadoExtracao {
  const limpo = texto.replace(/```(?:json)?/gi, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim <= ini) throw new Error("Resposta sem JSON.");
  return JSON.parse(limpo.slice(ini, fim + 1)) as ResultadoExtracao;
}

export async function POST(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();
  if (!podeCriarCard(s.perfil, "COMPRAS")) {
    return NextResponse.json({ erro: "Sem permissão para importar orçamentos." }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { erro: "Extração por IA não configurada: defina OPENAI_API_KEY nas variáveis de ambiente." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const pdfBase64: string | undefined = body.pdfBase64;
  if (!pdfBase64 || typeof pdfBase64 !== "string") {
    return NextResponse.json({ erro: "Envie o PDF em base64 no campo pdfBase64." }, { status: 400 });
  }
  // Limite prático do serverless (4,5 MB de request) — base64 infla ~33%.
  if (pdfBase64.length > 4_200_000) {
    return NextResponse.json({ erro: "PDF muito grande (máx. ~3 MB)." }, { status: 413 });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5.5",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                file: { filename: "orcamento.pdf", file_data: `data:application/pdf;base64,${pdfBase64}` },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`;
      return NextResponse.json({ erro: `Falha na IA: ${msg}` }, { status: 502 });
    }

    const texto: string = json?.choices?.[0]?.message?.content ?? "";
    const dados = parseJson(texto);

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
  } catch {
    return NextResponse.json({ erro: "Não foi possível ler o PDF." }, { status: 502 });
  }
}
