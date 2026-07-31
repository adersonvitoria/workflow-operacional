/**
 * Validação de uploads PDF. O tipo declarado pelo navegador não é confiável —
 * o que vale é o conteúdo: todo PDF começa com a assinatura "%PDF-".
 */

/** Limite prático do serverless (4,5 MB de request); base64 infla ~33%. */
export const LIMITE_BASE64 = 4_200_000;

/** True se o base64 realmente contém um PDF (assinatura %PDF- no início). */
export function ehPdfValido(base64: string): boolean {
  try {
    const inicio = Buffer.from(base64.slice(0, 16), "base64").toString("latin1");
    return inicio.startsWith("%PDF-");
  } catch {
    return false;
  }
}

/**
 * Cabeçalhos para servir um anexo com segurança: sem sniffing de tipo, sem
 * cache compartilhado e com CSP que impede execução de script embutido.
 */
export function cabecalhosPdf(nome: string, inline = true): Record<string, string> {
  const seguro = nome.replace(/[^\w.\-() ]/g, "_");
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${seguro}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; object-src 'none'; script-src 'none'; sandbox",
  };
}
