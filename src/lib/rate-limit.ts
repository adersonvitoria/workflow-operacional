/**
 * Limitador de taxa simples, em memória do processo. Protege rotas sensíveis
 * (login: força bruta · assistente: custo de IA) sem depender de serviço
 * externo. Em serverless o estado é por instância — não é uma barreira
 * perfeita, mas corta a repetição automatizada, que é o caso de uso real aqui.
 */

interface Registro {
  golpes: number;
  reiniciaEm: number;
}

const BALDES = new Map<string, Registro>();

/** Remove entradas vencidas para o mapa não crescer indefinidamente. */
function limpar(agora: number): void {
  if (BALDES.size < 500) return;
  for (const [k, v] of BALDES) if (v.reiniciaEm <= agora) BALDES.delete(k);
}

export interface ResultadoLimite {
  ok: boolean;
  /** Segundos até liberar (quando bloqueado). */
  esperarSegundos: number;
}

/**
 * Consome uma tentativa de `chave`. Permite `max` tentativas por `janelaMs`.
 */
export function consumir(chave: string, max: number, janelaMs: number): ResultadoLimite {
  const agora = Date.now();
  limpar(agora);
  const atual = BALDES.get(chave);
  if (!atual || atual.reiniciaEm <= agora) {
    BALDES.set(chave, { golpes: 1, reiniciaEm: agora + janelaMs });
    return { ok: true, esperarSegundos: 0 };
  }
  if (atual.golpes >= max) {
    return { ok: false, esperarSegundos: Math.ceil((atual.reiniciaEm - agora) / 1000) };
  }
  atual.golpes += 1;
  return { ok: true, esperarSegundos: 0 };
}

/** Zera o contador (ex.: após um login bem-sucedido). */
export function liberar(chave: string): void {
  BALDES.delete(chave);
}

/** IP do cliente a partir dos cabeçalhos do proxy (Vercel). */
export function ipDaRequisicao(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "desconhecido").trim();
}
