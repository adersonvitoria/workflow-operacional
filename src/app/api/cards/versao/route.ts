import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";

/**
 * Versão leve da base de cards para o polling de tempo real: muda sempre que
 * algum card é criado, movido, editado ou excluído. O cliente compara e só
 * recarrega a lista completa quando a versão muda.
 */
export async function GET() {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const agg = await prisma.card.aggregate({ _max: { updatedAt: true }, _count: true });
  const versao = `${agg._max.updatedAt?.getTime() ?? 0}:${agg._count}`;
  return NextResponse.json({ versao });
}
