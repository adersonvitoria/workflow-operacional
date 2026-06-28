import type { Card as PrismaCard } from "@prisma/client";
import type {
  Card,
  EventoHistorico,
  ItemChecklist,
  ItemMaterial,
  Setor,
} from "@/types";

function iso(d: Date | null): string | undefined {
  return d ? d.toISOString() : undefined;
}

/** Converte a linha do banco para o formato `Card` usado no front. */
export function rowToCard(r: PrismaCard): Card {
  return {
    id: r.id,
    codigo: r.codigo,
    fluxo: r.fluxo,
    etapa: r.etapa as Card["etapa"],
    status: r.status,
    prioridade: r.prioridade,
    complementar: r.complementar ?? undefined,
    conferenciaSuprimentos: r.conferenciaSuprimentos ?? undefined,
    modalidade: r.modalidade ?? undefined,
    natureza: r.natureza ?? undefined,
    cliente: {
      nome: r.clienteNome,
      documento: r.clienteDocumento ?? undefined,
      contato: r.clienteContato ?? undefined,
      endereco: r.clienteEndereco ?? undefined,
      tipo: (r.clienteTipo as Card["cliente"]["tipo"]) ?? undefined,
    },
    cr: r.cr ?? undefined,
    cc: r.cc ?? undefined,
    crMonitoramento: r.crMonitoramento ?? undefined,
    crLocacao: r.crLocacao ?? undefined,
    crServico: r.crServico ?? undefined,
    crMaterial: r.crMaterial ?? undefined,
    crMensalidade: r.crMensalidade ?? undefined,
    margemVenda: r.margemVenda ?? undefined,
    temContrato: r.temContrato ?? undefined,
    crDedicado: r.crDedicado ?? undefined,
    temInvestimento: r.temInvestimento ?? undefined,
    chamadoInvestimento: r.chamadoInvestimento ?? undefined,
    chamado: r.chamado ?? undefined,
    numeroOrcamento: r.numeroOrcamento ?? undefined,
    numeroConta: r.numeroConta ?? undefined,
    regiao: r.regiao ?? undefined,
    valores: {
      maoDeObra: r.valorMaoDeObra ?? undefined,
      equipamentos: r.valorEquipamentos ?? undefined,
      total: r.valorTotal ?? undefined,
      mensal: r.valorMensal ?? undefined,
      locacao: r.valorLocacao ?? undefined,
    },
    pagamento: (r.pagamento as unknown as Card["pagamento"]) ?? undefined,
    responsavelAtual: r.responsavelSetor
      ? { setor: r.responsavelSetor as Setor, pessoa: r.responsavelPessoa ?? undefined }
      : undefined,
    datas: {
      abertura: iso(r.dataAbertura) ?? new Date().toISOString(),
      aprovacao: iso(r.dataAprovacao),
      previsaoInstalacao: iso(r.dataPrevisaoInstalacao),
      conclusao: iso(r.dataConclusao),
    },
    aprovacaoInicial: (r.aprovacaoInicial as unknown as Card["aprovacaoInicial"]) ?? undefined,
    auditoriaFinal: (r.auditoriaFinal as unknown as Card["auditoriaFinal"]) ?? undefined,
    medicao: (r.medicao as unknown as Card["medicao"]) ?? undefined,
    almoxarifado: (r.almoxarifado as unknown as Card["almoxarifado"]) ?? undefined,
    sigma: (r.sigma as unknown as Card["sigma"]) ?? undefined,
    manutencao: (r.manutencao as unknown as Card["manutencao"]) ?? undefined,
    materiais: (r.materiais as unknown as ItemMaterial[]) ?? [],
    checklist: (r.checklist as unknown as ItemChecklist[]) ?? [],
    historico: (r.historico as unknown as EventoHistorico[]) ?? [],
    observacoes: r.observacoes ?? undefined,
  };
}
