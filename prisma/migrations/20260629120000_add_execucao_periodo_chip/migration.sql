-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "dataInicioExecucao" TIMESTAMP(3);
ALTER TABLE "Card" ADD COLUMN     "dataFimExecucao" TIMESTAMP(3);
ALTER TABLE "Card" ADD COLUMN     "tecnicos" TEXT;
ALTER TABLE "Card" ADD COLUMN     "numeroChip" TEXT;
