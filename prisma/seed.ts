import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEED_CARDS } from "../src/lib/mock-data";
import { CATALOGO_SEED } from "../src/lib/catalogo";
import type { Card } from "../src/types";

const prisma = new PrismaClient();

const USUARIOS = [
  { nome: "Jean Cardoso", email: "coordenacao@empresa.com", perfil: "COORDENADOR" },
  { nome: "Daniela Zimiani", email: "comercial@empresa.com", perfil: "COMERCIAL" },
  { nome: "Murilo Souza", email: "almoxarifado@empresa.com", perfil: "ALMOXARIFADO" },
  { nome: "Paulo Suprimentos", email: "suprimentos@empresa.com", perfil: "SUPRIMENTOS" },
  { nome: "Felipe Saldanha", email: "monitoramento@empresa.com", perfil: "SUPERVISOR_MONITORAMENTO" },
  { nome: "Jessi Diemes", email: "tecnica@empresa.com", perfil: "SUPERVISOR_TECNICO" },
  { nome: "Patrícia Medição", email: "medicao@empresa.com", perfil: "MEDICAO" },
  { nome: "Samya Cruz", email: "admin@empresa.com", perfil: "ADMINISTRATIVO" },
  { nome: "Assistente Manutenção", email: "assistente@empresa.com", perfil: "ASSISTENTE" },
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

  for (const it of CATALOGO_SEED) {
    await prisma.item.upsert({
      where: { descricao: it.descricao },
      update: { unidade: it.unidade, preco: it.preco },
      create: { descricao: it.descricao, unidade: it.unidade, preco: it.preco, ativo: true },
    });
  }
  console.log(`Itens do catálogo: ${CATALOGO_SEED.length}`);

  const total = await prisma.card.count();
  if (total === 0) {
    for (const c of SEED_CARDS) {
      await prisma.card.create({ data: cardData(c) as never });
    }
    console.log(`Cards: ${SEED_CARDS.length} inseridos.`);
  } else {
    console.log(`Cards: ${total} já existentes, seed de cards ignorado.`);
  }

  // Cards de demonstração do SLA (amarelo/vermelho/roxo) — idempotente por nome.
  const hAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const SLA_DEMO = [
    { nome: "DEMO SLA · Amarelo (72h)", etapa: "MONITORAMENTO", modalidade: "LOCACAO", horas: 72, total: 3000 },
    { nome: "DEMO SLA · Vermelho (108h)", etapa: "TECNICA", modalidade: "VENDA", horas: 108, total: 9000 },
    { nome: "DEMO SLA · Roxo (130h)", etapa: "SUPRIMENTOS", modalidade: "LOCACAO", horas: 130, total: 5000 },
  ];
  let criadosSla = 0;
  for (const d of SLA_DEMO) {
    const existe = await prisma.card.findFirst({ where: { clienteNome: d.nome } });
    if (existe) continue;
    await prisma.card.create({
      data: {
        codigo: "SLA",
        fluxo: "IMPLANTACAO",
        etapa: d.etapa,
        status: "EM_ANDAMENTO",
        prioridade: "NORMAL",
        modalidade: d.modalidade as never,
        clienteNome: d.nome,
        valorTotal: d.total,
        dataAbertura: new Date(hAgo(d.horas)),
        historico: [{ id: "h0", data: hAgo(d.horas), setor: "COMERCIAL", autor: "Seed", acao: "Entrou na etapa (demo SLA)", para: d.etapa }],
      } as never,
    });
    criadosSla++;
  }
  console.log(`Cards demo de SLA: ${criadosSla} criados (já existentes ignorados).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
