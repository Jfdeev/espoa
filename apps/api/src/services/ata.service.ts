import { db, ata } from "@espoa/database";
import { and, eq, isNull } from "drizzle-orm";

export async function createAta(data: {
  id?: string;
  associacaoId?: string | null;
  titulo: string;
  conteudo: string;
  data: string;
  participantes?: string | null;
  local?: string | null;
  deviceId?: string | null;
}) {
  const [created] = await db
    .insert(ata)
    .values({
      ...(data.id && { id: data.id }),
      associacaoId: data.associacaoId ?? null,
      titulo: data.titulo,
      conteudo: data.conteudo,
      data: data.data,
      participantes: data.participantes ?? null,
      local: data.local ?? null,
      deviceId: data.deviceId ?? null,
    })
    .returning();

  return { data: created };
}

export async function listAtas(filters: { associacaoId?: string } = {}) {
  const conditions = [isNull(ata.deletedAt)];

  if (filters.associacaoId) {
    conditions.push(eq(ata.associacaoId, filters.associacaoId));
  }

  return db
    .select()
    .from(ata)
    .where(and(...conditions));
}

export async function getAta(id: string) {
  const [row] = await db
    .select()
    .from(ata)
    .where(and(eq(ata.id, id), isNull(ata.deletedAt)))
    .limit(1);

  return row ?? null;
}

export async function updateAta(
  id: string,
  data: Partial<{
    titulo: string;
    conteudo: string;
    data: string;
    participantes: string | null;
    local: string | null;
    deviceId: string | null;
  }>,
) {
  const [updated] = await db
    .update(ata)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(ata.id, id), isNull(ata.deletedAt)))
    .returning();

  return updated ? { data: updated } : { error: "not_found" };
}

export async function deleteAta(id: string) {
  const now = new Date();
  const [deleted] = await db
    .update(ata)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(ata.id, id), isNull(ata.deletedAt)))
    .returning();

  return deleted ? { data: deleted } : { error: "not_found" };
}
