import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeGerenciarTecnicos } from "@/lib/perfis";

/** Lista de técnicos (qualquer usuário autenticado — alimenta os campos do card). */
export async function GET() {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const tecnicos = await prisma.tecnico.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json({ tecnicos });
}

/** Cadastrar técnico — somente o Coordenador. */
export async function POST(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!podeGerenciarTecnicos(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const nome = String(b.nome ?? "").trim();
  if (!nome) return NextResponse.json({ erro: "Informe o nome do técnico." }, { status: 400 });
  const tipo = b.tipo === "TERCEIRO" ? "TERCEIRO" : "TECNICO";

  const tecnico = await prisma.tecnico.create({ data: { nome, tipo, ativo: b.ativo ?? true } });
  return NextResponse.json({ tecnico }, { status: 201 });
}
