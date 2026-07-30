-- Manutenção · coluna Orçamento: PDF anexado (obrigatório p/ enviar ao Aguardando)
ALTER TABLE "Card" ADD COLUMN "orcamentoPdfNome" TEXT;

CREATE TABLE "OrcamentoPdf" (
    "cardId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dados" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrcamentoPdf_pkey" PRIMARY KEY ("cardId"),
    CONSTRAINT "OrcamentoPdf_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
