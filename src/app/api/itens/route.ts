import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeGerenciarItens } from "@/lib/perfis";

export async function GET() {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const itens = await prisma.item.findMany({ orderBy: { descricao: "asc" } });
  return NextResponse.json({ itens });
}

export async function POST(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!podeGerenciarItens(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  if (!b.descricao || !String(b.descricao).trim()) {
    return NextResponse.json({ erro: "Informe a descrição do item." }, { status: 400 });
  }
  const existe = await prisma.item.findUnique({ where: { descricao: String(b.descricao).trim() } });
  if (existe) return NextResponse.json({ erro: "Já existe um item com essa descrição." }, { status: 409 });

  const item = await prisma.item.create({
    data: {
      descricao: String(b.descricao).trim(),
      unidade: b.unidade || "un",
      preco: Number(b.preco) || 0,
      ativo: b.ativo ?? true,
    },
  });
  return NextResponse.json({ item }, { status: 201 });
}
