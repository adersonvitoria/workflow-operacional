-- Anexos PDF avulsos do card (vários por card) — Comercial (Implantação) e
-- Pedido ao Fornecedor (Compras).
CREATE TABLE "AnexoPdf" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "etapa" TEXT,
    "dados" TEXT NOT NULL,
    "autor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnexoPdf_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnexoPdf_cardId_idx" ON "AnexoPdf"("cardId");

ALTER TABLE "AnexoPdf" ADD CONSTRAINT "AnexoPdf_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
