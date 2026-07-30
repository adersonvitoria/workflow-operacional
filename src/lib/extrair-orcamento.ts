/**
 * Extração de dados de um orçamento em PDF via OpenAI (GPT-5.5, escolha do
 * cliente; modelo configurável por OPENAI_MODEL). Usada pela esteira de
 * Compras (criar card a partir do PDF) e pela coluna Orçamento da Manutenção
 * (anexo obrigatório + pré-preenchimento de nº/valor do orçamento).
 */

const PROMPT = `Você está lendo o PDF de um orçamento de uma empresa de segurança eletrônica.
Extraia EXATAMENTE o JSON abaixo, sem nenhum texto antes ou depois, sem cercas de código:

{
  "cliente": "nome do cliente",
  "numeroOrcamento": "número do orçamento se houver, senão null",
  "dataAprovacao": "data de aprovação/emissão no formato YYYY-MM-DD se houver, senão null",
  "valorTotal": 0,
  "itens": [
    { "quantidade": 1, "material": "descrição do item", "setor": "setor de uso se indicado, senão null" }
  ]
}

Regras:
- Liste TODOS os itens/materiais do orçamento, um por linha da tabela.
- "quantidade" é número (se vier "2 un", use 2; se não houver, use 1).
- "valorTotal" é o valor total do orçamento em número (ex.: 1234.56); se não houver, use null.
- Não invente valores: campo ausente no PDF vira null.
- Responda somente com o JSON.`;

export interface ItemExtraido {
  quantidade: number;
  material: string;
  setor?: string | null;
}

export interface OrcamentoExtraido {
  cliente?: string | null;
  numeroOrcamento?: string | null;
  dataAprovacao?: string | null;
  valorTotal?: number | null;
  itens?: ItemExtraido[];
}

/** Remove cercas de código e extrai o primeiro objeto JSON do texto. */
function parseJson(texto: string): OrcamentoExtraido {
  const limpo = texto.replace(/```(?:json)?/gi, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim <= ini) throw new Error("Resposta sem JSON.");
  return JSON.parse(limpo.slice(ini, fim + 1)) as OrcamentoExtraido;
}

/** True quando a extração por IA está configurada (OPENAI_API_KEY presente). */
export function extracaoConfigurada(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Chama a OpenAI com o PDF (base64) e devolve os dados extraídos.
 * Lança Error com mensagem legível em caso de falha.
 */
export async function extrairOrcamentoPdf(pdfBase64: string): Promise<OrcamentoExtraido> {
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
    throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  }
  const texto: string = json?.choices?.[0]?.message?.content ?? "";
  return parseJson(texto);
}
