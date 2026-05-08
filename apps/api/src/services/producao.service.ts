import { db, producao } from "@espoa/database";
import { eq, and, isNull } from "drizzle-orm";

export async function createProducao(data: {
  id?: string;
  associadoId: string;
  cultura: string;
  quantidade: number;
  data: string;
  deviceId?: string | null;
}) {
  const [created] = await db
    .insert(producao)
    .values({
      ...(data.id && { id: data.id }),
      associadoId: data.associadoId,
      cultura: data.cultura,
      quantidade: data.quantidade,
      data: data.data,
      deviceId: data.deviceId ?? null,
    })
    .returning();

  return { data: created };
}

export async function listProducoes() {
  return db
    .select()
    .from(producao)
    .where(isNull(producao.deletedAt));
}

export async function getProducao(id: string) {
  const [row] = await db
    .select()
    .from(producao)
    .where(and(eq(producao.id, id), isNull(producao.deletedAt)))
    .limit(1);

  return row ?? null;
}

export async function updateProducao(
  id: string,
  data: Partial<{
    associadoId: string;
    cultura: string;
    quantidade: number;
    data: string;
    deviceId: string | null;
  }>,
) {
  const [updated] = await db
    .update(producao)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(producao.id, id), isNull(producao.deletedAt)))
    .returning();

  return updated ? { data: updated } : { error: "not_found" };
}

export async function deleteProducao(id: string) {
  const now = new Date();
  const [deleted] = await db
    .update(producao)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(producao.id, id), isNull(producao.deletedAt)))
    .returning();

  return deleted ? { data: deleted } : { error: "not_found" };
}
