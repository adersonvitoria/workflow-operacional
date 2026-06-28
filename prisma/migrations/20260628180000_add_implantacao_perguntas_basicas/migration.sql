-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "crMensalidade" TEXT;
ALTER TABLE "Card" ADD COLUMN     "temContrato" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Card" ADD COLUMN     "crDedicado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Card" ADD COLUMN     "temInvestimento" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Card" ADD COLUMN     "chamadoInvestimento" TEXT;
