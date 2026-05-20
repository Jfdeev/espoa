import type { Response, NextFunction } from "express";
import { db, usuarioAssociacao } from "@espoa/database";
import { and, eq } from "drizzle-orm";
import type { AuthenticatedRequest } from "./auth.middleware";

/**
 * Verifica se o usuário autenticado é administrador ativo da associação informada.
 *
 * Diferente de `ensureUserIsMember`, exige `role = "adm"` além de `status = "ativo"`.
 * Usado para proteger rotas mutativas (POST/PUT/DELETE) onde só admins podem agir.
 */
export async function ensureUserIsAdmin(
  userId: string,
  associacaoId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: usuarioAssociacao.id })
    .from(usuarioAssociacao)
    .where(
      and(
        eq(usuarioAssociacao.usuarioId, userId),
        eq(usuarioAssociacao.associacaoId, associacaoId),
        eq(usuarioAssociacao.role, "adm"),
        eq(usuarioAssociacao.status, "ativo"),
      ),
    )
    .limit(1);

  return Boolean(row);
}

type AssociacaoIdResolver = (
  req: AuthenticatedRequest,
) => Promise<string | null | undefined> | string | null | undefined;

/**
 * Cria um middleware Express que exige que `req.userId` seja admin ativo
 * da associação retornada pelo `resolve`.
 *
 * Respostas:
 *  - 401 se `req.userId` não estiver presente (requireAuth precisa rodar antes)
 *  - 400 se o resolver não conseguir determinar `associacaoId`
 *  - 403 se o usuário não for admin ativo da associação
 */
export function requireAdminOfAssociacao(resolve: AssociacaoIdResolver) {
  return async function adminGuard(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.userId) {
      res.status(401).json({ error: "nao_autenticado" });
      return;
    }

    let associacaoId: string | null | undefined;
    try {
      associacaoId = await resolve(req);
    } catch (error) {
      console.error("requireAdminOfAssociacao resolver error", error);
      res.status(500).json({ error: "resolver_failed" });
      return;
    }

    if (!associacaoId) {
      res.status(400).json({ error: "associacao_id_obrigatorio" });
      return;
    }

    const isAdmin = await ensureUserIsAdmin(req.userId, associacaoId);
    if (!isAdmin) {
      res.status(403).json({ error: "acesso_negado_admin" });
      return;
    }

    next();
  };
}

/**
 * Atalho: lê `associacao_id` (snake) ou `associacaoId` (camel) do body.
 * Útil para POSTs onde o corpo carrega a associação alvo.
 */
export const requireAdminFromBody = requireAdminOfAssociacao((req) => {
  const body = req.body ?? {};
  return body.associacao_id ?? body.associacaoId ?? null;
});

/**
 * Gera um middleware que carrega um recurso pelo `req.params.id` via `loader`,
 * lê seu `associacaoId` e verifica admin. Necessário para PUT/DELETE onde
 * o body não traz `associacao_id`.
 *
 * Distinções:
 *  - 404 se o loader retornar null (recurso inexistente)
 *  - 400 se o recurso existir mas tiver `associacaoId` nulo (dado órfão)
 *  - 403 se o usuário não for admin
 */
export function requireAdminFromResource<T>(
  loader: (id: string) => Promise<T | null>,
) {
  return async function adminResourceGuard(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.userId) {
      res.status(401).json({ error: "nao_autenticado" });
      return;
    }

    const rawId = req.params?.id;
    const id = typeof rawId === "string" ? rawId : null;
    if (!id) {
      res.status(400).json({ error: "id_obrigatorio" });
      return;
    }

    let resource: T | null;
    try {
      resource = await loader(id);
    } catch (error) {
      console.error("requireAdminFromResource loader error", error);
      res.status(500).json({ error: "loader_failed" });
      return;
    }

    if (!resource) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const associacaoId = (resource as { associacaoId?: string | null })
      .associacaoId;
    if (!associacaoId) {
      res.status(400).json({ error: "associacao_id_obrigatorio" });
      return;
    }

    const isAdmin = await ensureUserIsAdmin(req.userId, associacaoId);
    if (!isAdmin) {
      res.status(403).json({ error: "acesso_negado_admin" });
      return;
    }

    next();
  };
}
