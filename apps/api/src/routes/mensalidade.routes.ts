import { Router } from "express";
import { db, associado, usuarioAssociacao } from "@espoa/database";
import { and, eq, isNull } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.middleware";
import {
  requireAdminOfAssociacao,
  requireAdminFromResource,
} from "../middleware/admin.guard";
import { getMensalidade as loadMensalidade } from "../services/mensalidade.service";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import type { Response, NextFunction } from "express";
import {
  postMensalidade,
  getMensalidades,
  getMensalidadeById,
  putMensalidade,
  deleteMensalidadeById,
} from "../controllers/mensalidade.controller";

/**
 * Mensalidade não tem `associacaoId` direto no schema — derivamos via
 * `associadoId.associacaoId` ou via `usuario_associacao` ativo do `usuarioId`.
 */
async function resolveAssociacaoIdByAssociado(
  associadoId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ associacaoId: associado.associacaoId })
    .from(associado)
    .where(and(eq(associado.id, associadoId), isNull(associado.deletedAt)))
    .limit(1);
  return row?.associacaoId ?? null;
}

async function resolveAssociacaoIdByUsuario(
  usuarioId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ associacaoId: usuarioAssociacao.associacaoId })
    .from(usuarioAssociacao)
    .where(
      and(
        eq(usuarioAssociacao.usuarioId, usuarioId),
        eq(usuarioAssociacao.status, "ativo"),
      ),
    )
    .limit(1);
  return row?.associacaoId ?? null;
}

async function resolveAssociacaoIdFromBody(
  req: AuthenticatedRequest,
): Promise<string | null> {
  const body = req.body ?? {};
  const associadoId = body.associado_id ?? body.associadoId ?? null;
  const usuarioId = body.usuario_id ?? body.usuarioId ?? null;
  if (associadoId) return resolveAssociacaoIdByAssociado(associadoId);
  if (usuarioId) return resolveAssociacaoIdByUsuario(usuarioId);
  return null;
}

/**
 * POST /mensalidades:
 *  - self-service: membro pagando sua própria mensalidade (usuario_id === req.userId) passa
 *  - caso contrário: exige admin da associação do alvo
 */
async function authorizeMensalidadePost(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const body = req.body ?? {};
  const targetUsuarioId = body.usuario_id ?? body.usuarioId ?? null;

  if (targetUsuarioId && targetUsuarioId === req.userId) {
    return next();
  }

  return requireAdminOfAssociacao(resolveAssociacaoIdFromBody)(req, res, next);
}

const loadMensalidadeForGuard = async (id: string) => {
  const mens = await loadMensalidade(id);
  if (!mens) return null;
  let associacaoId: string | null = null;
  if (mens.associadoId) {
    associacaoId = await resolveAssociacaoIdByAssociado(mens.associadoId);
  } else if (mens.usuarioId) {
    associacaoId = await resolveAssociacaoIdByUsuario(mens.usuarioId);
  }
  return { associacaoId };
};

export const mensalidadeRouter = Router();

mensalidadeRouter.use(requireAuth);
mensalidadeRouter.get("/mensalidades", getMensalidades);
mensalidadeRouter.get("/mensalidades/:id", getMensalidadeById);
mensalidadeRouter.post(
  "/mensalidades",
  authorizeMensalidadePost,
  postMensalidade,
);
mensalidadeRouter.put(
  "/mensalidades/:id",
  requireAdminFromResource(loadMensalidadeForGuard),
  putMensalidade,
);
mensalidadeRouter.delete(
  "/mensalidades/:id",
  requireAdminFromResource(loadMensalidadeForGuard),
  deleteMensalidadeById,
);
