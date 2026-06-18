import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEED_CARDS } from "../src/lib/mock-data";
import type { Card } from "../src/types";

const prisma = new PrismaClient();

const USUARIOS = [
  { nome: "Carla Coordenação", email: "coordenacao@empresa.com", perfil: "COORDENADOR" },
  { nome: "Daniela Zimiani", email: "comercial@empresa.com", perfil: "COMERCIAL" },
  { nome: "Murilo Souza", email: "almoxarifado@empresa.com", perfil: "ALMOXARIFADO" },
  { nome: "Paulo Suprimentos", email: "suprimentos@empresa.com", perfil: "SUPRIMENTOS" },
  { nome: "Felipe Saldanha", email: "monitoramento@empresa.com", perfil: "SUPERVISOR_MONITORAMENTO" },
  { nome: "Jessi Diemes", email: "tecnica@empresa.com", perfil: "SUPERVISOR_TECNICO" },
  { nome: "Samya Cruz", email: "admin@empresa.com", perfil: "ADMINISTRATIVO" },
] as const;

const SENHA_PADRAO = "123456";

function cardData(c: Card) {
  return {
    codigo: c.codigo,
    fluxo: c.fluxo,
    etapa: c.etapa,
    status: c.status,
    prioridade: c.prioridade,
    modalidade: c.modalidade ?? null,
    natureza: c.natureza ?? null,
    clienteNome: c.cliente.nome,
    clienteDocumento: c.cliente.documento ?? null,
    clienteContato: c.cliente.contato ?? null,
    clienteEndereco: c.cliente.endereco ?? null,
    cr: c.cr ?? null,
    cc: c.cc ?? null,
    chamado: c.chamado ?? null,
    numeroOrcamento: c.numeroOrcamento ?? null,
    valorMaoDeObra: c.valores.maoDeObra ?? null,
    valorEquipamentos: c.valores.equipamentos ?? null,
    valorTotal: c.valores.total ?? null,
    valorMensal: c.valores.mensal ?? null,
    pagamento: c.pagamento ?? undefined,
    responsavelSetor: c.responsavelAtual?.setor ?? null,
    responsavelPessoa: c.responsavelAtual?.pessoa ?? null,
    aprovacaoInicial: c.aprovacaoInicial ?? undefined,
    auditoriaFinal: c.auditoriaFinal ?? undefined,
    almoxarifado: c.almoxarifado ?? undefined,
    sigma: c.sigma ?? undefined,
    materiais: c.materiais ?? [],
    checklist: c.checklist ?? [],
    historico: c.historico ?? [],
    observacoes: c.observacoes ?? null,
  };
}

async function main() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  for (const u of USUARIOS) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nome: u.nome, perfil: u.perfil as never, ativo: true },
      create: { nome: u.nome, email: u.email, perfil: u.perfil as never, ativo: true, senhaHash },
    });
  }
  console.log(`Usuários: ${USUARIOS.length} (senha padrão: ${SENHA_PADRAO})`);

  const total = await prisma.card.count();
  if (total === 0) {
    for (const c of SEED_CARDS) {
      await prisma.card.create({ data: cardData(c) as never });
    }
    console.log(`Cards: ${SEED_CARDS.length} inseridos.`);
  } else {
    console.log(`Cards: ${total} já existentes, seed de cards ignorado.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
