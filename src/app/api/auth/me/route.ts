import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";

export async function GET() {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ usuario: null }, { status: 200 });
  const u = await prisma.usuario.findUnique({ where: { id: s.userId } });
  if (!u || !u.ativo) return NextResponse.json({ usuario: null }, { status: 200 });
  return NextResponse.json({ usuario: { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo } });
}
