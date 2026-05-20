import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  requireAdminFromBody,
  requireAdminFromResource,
} from "../middleware/admin.guard";
import { getTransacaoFinanceira as loadTransacaoFinanceira } from "../services/transacao-financeira.service";
import {
  postTransacaoFinanceira,
  getTransacoesFinanceiras,
  getTransacaoFinanceiraById,
  putTransacaoFinanceira,
  deleteTransacaoFinanceiraById,
} from "../controllers/transacao-financeira.controller";

export const transacaoFinanceiraRouter = Router();

transacaoFinanceiraRouter.use(requireAuth);
transacaoFinanceiraRouter.get(
  "/transacoes-financeiras",
  getTransacoesFinanceiras,
);
transacaoFinanceiraRouter.get(
  "/transacoes-financeiras/:id",
  getTransacaoFinanceiraById,
);
transacaoFinanceiraRouter.post(
  "/transacoes-financeiras",
  requireAdminFromBody,
  postTransacaoFinanceira,
);
transacaoFinanceiraRouter.put(
  "/transacoes-financeiras/:id",
  requireAdminFromResource(loadTransacaoFinanceira),
  putTransacaoFinanceira,
);
transacaoFinanceiraRouter.delete(
  "/transacoes-financeiras/:id",
  requireAdminFromResource(loadTransacaoFinanceira),
  deleteTransacaoFinanceiraById,
);
