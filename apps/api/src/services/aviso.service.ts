import { db, aviso } from "@espoa/database";
import { and, eq, gt, isNull, or, desc } from "drizzle-orm";

export interface CreateAvisoInput {
  id?: string;
  associacaoId: string;
  titulo: string;
  mensagem: string;
  expiraEm?: string | Date | null;
  deviceId?: string | null;
}

export interface UpdateAvisoInput {
  titulo?: string;
  mensagem?: string;
  expiraEm?: string | Date | null;
  deviceId?: string | null;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createAviso(data: CreateAvisoInput) {
  const [created] = await db
    .insert(aviso)
    .values({
      ...(data.id && { id: data.id }),
      associacaoId: data.associacaoId,
      titulo: data.titulo,
      mensagem: data.mensagem,
      expiraEm: toDate(data.expiraEm),
      deviceId: data.deviceId ?? null,
    })
    .returning();
  return { data: created };
}

export async function listAvisos(filters: { associacaoId?: string } = {}) {
  const conditions = [isNull(aviso.deletedAt)];
  if (filters.associacaoId) {
    conditions.push(eq(aviso.associacaoId, filters.associacaoId));
  }
  return db
    .select()
    .from(aviso)
    .where(and(...conditions))
    .orderBy(desc(aviso.updatedAt));
}

export async function listAvisosAtivos(associacaoId: string) {
  const now = new Date();
  return db
    .select()
    .from(aviso)
    .where(
      and(
        eq(aviso.associacaoId, associacaoId),
        isNull(aviso.deletedAt),
        or(isNull(aviso.expiraEm), gt(aviso.expiraEm, now))!,
      ),
    )
    .orderBy(desc(aviso.updatedAt));
}

export async function getAviso(id: string) {
  const [row] = await db
    .select()
    .from(aviso)
    .where(and(eq(aviso.id, id), isNull(aviso.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function updateAviso(id: string, data: UpdateAvisoInput) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.titulo !== undefined) patch.titulo = data.titulo;
  if (data.mensagem !== undefined) patch.mensagem = data.mensagem;
  if (data.expiraEm !== undefined) patch.expiraEm = toDate(data.expiraEm);
  if (data.deviceId !== undefined) patch.deviceId = data.deviceId;

  const [updated] = await db
    .update(aviso)
    .set(patch)
    .where(and(eq(aviso.id, id), isNull(aviso.deletedAt)))
    .returning();

  return updated ? { data: updated } : { error: "not_found" };
}

export async function deleteAviso(id: string) {
  const now = new Date();
  const [deleted] = await db
    .update(aviso)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(aviso.id, id), isNull(aviso.deletedAt)))
    .returning();

  return deleted ? { data: deleted } : { error: "not_found" };
}
