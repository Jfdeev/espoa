import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { db, usuarioAssociacao, usuario, associado } from "@espoa/database";
import { and, eq, isNull } from "drizzle-orm";
import { toSnakeObject } from "../utils/case-mapper";

/**
 * GET /associacoes/:id/membros
 *
 * Retorna todos os membros de uma associação unificando duas fontes:
 * 1. usuario_associacao (membros com conta vinculada)
 * 2. associado (membros cadastrados pelo admin, podem não ter conta)
 *
 * Resultado: lista deduplicada com { id, nome, usuario_id, role, status, fonte }
 */
export async function listarMembrosAssociacao(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { id: assocId } = req.params as { id: string };

  // Verificar que o requisitante pertence à associação
  const [vinculoReq] = await db
    .select()
    .from(usuarioAssociacao)
    .where(
      and(
        eq(usuarioAssociacao.associacaoId, assocId),
        eq(usuarioAssociacao.usuarioId, req.userId!),
      ),
    )
    .limit(1);

  if (!vinculoReq || vinculoReq.status !== "ativo") {
    res.status(403).json({ error: "Sem permissão para acessar esta associação" });
    return;
  }

  // Fonte 1: usuario_associacao + usuario (membros com conta)
  const vinculos = await db
    .select({
      usuarioId: usuarioAssociacao.usuarioId,
      role: usuarioAssociacao.role,
      status: usuarioAssociacao.status,
      nome: usuario.nome,
    })
    .from(usuarioAssociacao)
    .innerJoin(usuario, eq(usuarioAssociacao.usuarioId, usuario.id))
    .where(eq(usuarioAssociacao.associacaoId, assocId));

  // Fonte 2: tabela associado (membros cadastrados pelo admin)
  const associados = await db
    .select({
      id: associado.id,
      nome: associado.nome,
      usuarioId: associado.usuarioId,
      status: associado.status,
    })
    .from(associado)
    .where(and(eq(associado.associacaoId, assocId), isNull(associado.deletedAt)));

  // Merge: deduplica por usuario_id, priorizando usuario_associacao
  const membrosMap = new Map<string, {
    id: string;
    nome: string;
    usuarioId: string | null;
    role: string;
    status: string;
  }>();

  // Primeiro adiciona associados (fonte base)
  for (const a of associados) {
    const key = a.usuarioId ?? a.id;
    membrosMap.set(key, {
      id: a.id,
      nome: a.nome,
      usuarioId: a.usuarioId,
      role: "associado",
      status: a.status ?? "ativo",
    });
  }

  // Depois sobrescreve com vinculos (mais autoridade para role/status, tem nome do usuario)
  for (const v of vinculos) {
    const existing = membrosMap.get(v.usuarioId);
    membrosMap.set(v.usuarioId, {
      id: existing?.id ?? v.usuarioId,
      nome: v.nome || existing?.nome || v.usuarioId.slice(0, 8),
      usuarioId: v.usuarioId,
      role: v.role,
      status: v.status,
    });
  }

  const membros = Array.from(membrosMap.values());
  res.json(membros);
}
