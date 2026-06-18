import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Perfil } from "@/lib/perfis";

export const COOKIE_NOME = "wo_session";

const segredo = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-insecure-secret-troque-em-producao",
);

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
    .sign(segredo);
}

export async function verificarToken(token: string): Promise<Sessao | null> {
  try {
    const { payload } = await jwtVerify(token, segredo);
    return {
      userId: String(payload.sub),
      perfil: payload.perfil as Perfil,
      nome: String(payload.nome ?? ""),
    };
  } catch {
    return null;
  }
}

/** Lê a sessão do cookie httpOnly (em route handlers / server components). */
export async function obterSessao(): Promise<Sessao | null> {
  const token = cookies().get(COOKIE_NOME)?.value;
  if (!token) return null;
  return verificarToken(token);
}

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};
