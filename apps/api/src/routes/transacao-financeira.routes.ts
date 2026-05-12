import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  postTransacaoFinanceira,
  getTransacoesFinanceiras,
  getTransacaoFinanceiraById,
  putTransacaoFinanceira,
  deleteTransacaoFinanceiraById,
} from "../controllers/transacao-financeira.controller";

export const transacaoFinanceiraRouter = Router();

transacaoFinanceiraRouter.use(requireAuth);
transacaoFinanceiraRouter.post(
  "/transacoes-financeiras",
  postTransacaoFinanceira,
);
transacaoFinanceiraRouter.get(
  "/transacoes-financeiras",
  getTransacoesFinanceiras,
);
transacaoFinanceiraRouter.get(
  "/transacoes-financeiras/:id",
  getTransacaoFinanceiraById,
);
transacaoFinanceiraRouter.put(
  "/transacoes-financeiras/:id",
  putTransacaoFinanceira,
);
transacaoFinanceiraRouter.delete(
  "/transacoes-financeiras/:id",
  deleteTransacaoFinanceiraById,
);
