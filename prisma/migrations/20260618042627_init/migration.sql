-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('COORDENADOR', 'SUPERVISOR_TECNICO', 'SUPERVISOR_MONITORAMENTO', 'COMERCIAL', 'ADMINISTRATIVO', 'ALMOXARIFADO');

-- CreateEnum
CREATE TYPE "Fluxo" AS ENUM ('IMPLANTACAO', 'MANUTENCAO');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('EM_ANDAMENTO', 'AGUARDANDO_APROVACAO', 'CONCLUIDO', 'TRAVADO');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('LOCACAO', 'VENDA');

-- CreateEnum
CREATE TYPE "Natureza" AS ENUM ('INVESTIMENTO', 'DESPESA', 'ESTOQUE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fluxo" "Fluxo" NOT NULL,
    "etapa" TEXT NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "prioridade" "Prioridade" NOT NULL DEFAULT 'NORMAL',
    "modalidade" "Modalidade",
    "natureza" "Natureza",
    "clienteNome" TEXT NOT NULL,
    "clienteDocumento" TEXT,
    "clienteContato" TEXT,
    "clienteEndereco" TEXT,
    "cr" TEXT,
    "cc" TEXT,
    "chamado" TEXT,
    "numeroOrcamento" TEXT,
    "valorMaoDeObra" DOUBLE PRECISION,
    "valorEquipamentos" DOUBLE PRECISION,
    "valorTotal" DOUBLE PRECISION,
    "valorMensal" DOUBLE PRECISION,
    "pagamento" JSONB,
    "responsavelSetor" TEXT,
    "responsavelPessoa" TEXT,
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAprovacao" TIMESTAMP(3),
    "dataPrevisaoInstalacao" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "aprovacaoInicial" JSONB,
    "auditoriaFinal" JSONB,
    "almoxarifado" JSONB,
    "sigma" JSONB,
    "materiais" JSONB NOT NULL DEFAULT '[]',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "historico" JSONB NOT NULL DEFAULT '[]',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Card_fluxo_etapa_idx" ON "Card"("fluxo", "etapa");
