import { prisma } from "@/lib/db";
import { CONFIG_PADRAO, definirConfigPerfis, PERFIS, type Capacidades, type PerfilConfig } from "@/lib/perfis";
import type { EtapaId } from "@/types";
import type { Perfil } from "@/lib/perfis";

/**
 * Carrega as permissões por perfil do banco e aplica sobre os padrões.
 * Deve ser chamada no início das rotas que aplicam RBAC (a config é lida do
 * cache síncrono pelas funções pode*). Em erro, mantém os padrões.
 */
export async function carregarConfigPerfis(): Promise<void> {
  try {
    const rows = await prisma.perfilConfig.findMany();
    const overrides: Partial<Record<Perfil, PerfilConfig>> = {};
    for (const r of rows) {
      const perfil = r.perfil as Perfil;
      if (!PERFIS.includes(perfil)) continue;
      const padrao = CONFIG_PADRAO[perfil];
      overrides[perfil] = {
        etapas: Array.isArray(r.etapas) ? (r.etapas as EtapaId[]) : padrao.etapas,
        capacidades: { ...padrao.capacidades, ...((r.capacidades as Partial<Capacidades>) ?? {}) },
        acoes: Array.isArray(r.acoes) ? (r.acoes as string[]) : padrao.acoes,
      };
    }
    definirConfigPerfis(overrides);
  } catch {
    definirConfigPerfis({});
  }
}
