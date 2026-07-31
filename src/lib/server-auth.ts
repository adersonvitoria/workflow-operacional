import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import type { Perfil } from "@/lib/perfis";

export const COOKIE_NOME = "wo_session";

/**
 * Segredo de assinatura da sessão. Em produção é OBRIGATÓRIO definir
 * SESSION_SECRET — sem ele o servidor recusa a operação em vez de cair
 * silenciosamente num segredo público (que permitiria forjar sessões).
 */
function obterSegredo(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET não configurado — defina a variável de ambiente antes de subir a aplicação.");
    }
    return new TextEncoder().encode("dev-insecure-secret-troque-em-producao");
  }
  return new TextEncoder().encode(s);
}

export interface Sessao {
  userId: string;
  perfil: Perfil;
  nome: string;
}

export async function assinarSessao(s: Sessao): Promise<string> {
  return new SignJWT({ perfil: s.perfil, nome: s.nome })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(obterSegredo());
}

/** Valida apenas a assinatura do token (sem consultar o banco). */
export async function verificarToken(token: string): Promise<Sessao | null> {
  try {
    const { payload } = await jwtVerify(token, obterSegredo());
    return {
      userId: String(payload.sub),
      perfil: payload.perfil as Perfil,
      nome: String(payload.nome ?? ""),
    };
  } catch {
    return null;
  }
}

/**
 * Lê a sessão do cookie httpOnly e a CONFIRMA no banco: o usuário precisa
 * existir e estar ativo, e o perfil válido é sempre o atual do cadastro —
 * nunca o que está gravado no token. Assim, desativar um usuário ou rebaixar
 * seu perfil tem efeito imediato, sem esperar o token expirar.
 */
export async function obterSessao(): Promise<Sessao | null> {
  const token = (await cookies()).get(COOKIE_NOME)?.value;
  if (!token) return null;
  const s = await verificarToken(token);
  if (!s) return null;

  const u = await prisma.usuario.findUnique({
    where: { id: s.userId },
    select: { id: true, nome: true, perfil: true, ativo: true },
  });
  if (!u || !u.ativo) return null;
  return { userId: u.id, perfil: u.perfil as Perfil, nome: u.nome };
}

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};
