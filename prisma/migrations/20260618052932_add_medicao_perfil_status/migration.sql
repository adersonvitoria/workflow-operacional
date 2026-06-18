-- AlterEnum
ALTER TYPE "CardStatus" ADD VALUE 'FINALIZADO';

-- AlterEnum
ALTER TYPE "Perfil" ADD VALUE 'MEDICAO';

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "medicao" JSONB;
