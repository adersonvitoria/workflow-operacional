-- Troca obrigatória de senha no próximo login (senha inicial gerada, redefinida
-- pelo gestor ou senha antiga fraca).
ALTER TABLE "Usuario" ADD COLUMN "precisaTrocarSenha" BOOLEAN NOT NULL DEFAULT false;
