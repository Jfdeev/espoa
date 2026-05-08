import { db, mensalidade, associado } from "@espoa/database";
import { and, eq, isNull } from "drizzle-orm";

async function associadoExiste(associadoId: string) {
  const existing = await db
    .select({ id: associado.id })
    .from(associado)
    .where(and(eq(associado.id, associadoId), isNull(associado.deletedAt)))
    .limit(1);

  return existing.length > 0;
}

export async function createMensalidade(data: {
  id?: string;
  associadoId: string;
  valor: number;
  dataPagamento?: string | null;
  formaPagamento?: string | null;
  deviceId?: string | null;
}) {
  const valido = await associadoExiste(data.associadoId);
  if (!valido) {
    return { error: "associado_inexistente" };
  }

  const [created] = await db
    .insert(mensalidade)
    .values({
      ...(data.id && { id: data.id }),
      associadoId: data.associadoId,
      valor: data.valor,
      dataPagamento: data.dataPagamento ?? null,
      formaPagamento: data.formaPagamento ?? null,
      deviceId: data.deviceId ?? null,
    })
    .returning();

  return { data: created };
}

export async function listMensalidades() {
  return db.select().from(mensalidade).where(isNull(mensalidade.deletedAt));
}

export async function getMensalidade(id: string) {
  const [row] = await db
    .select()
    .from(mensalidade)
    .where(and(eq(mensalidade.id, id), isNull(mensalidade.deletedAt)))
    .limit(1);

  return row ?? null;
}

export async function updateMensalidade(
  id: string,
  data: Partial<{
    associadoId: string;
    valor: number;
    dataPagamento: string | null;
    formaPagamento: string | null;
    deviceId: string | null;
  }>,
) {
  if (data.associadoId) {
    const valido = await associadoExiste(data.associadoId);
    if (!valido) {
      return { error: "associado_inexistente" };
    }
  }

  const [updated] = await db
    .update(mensalidade)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(mensalidade.id, id), isNull(mensalidade.deletedAt)))
    .returning();

  return updated ? { data: updated } : { error: "not_found" };
}

export async function deleteMensalidade(id: string) {
  const now = new Date();
  const [deleted] = await db
    .update(mensalidade)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(mensalidade.id, id), isNull(mensalidade.deletedAt)))
    .returning();

  return deleted ? { data: deleted } : { error: "not_found" };
}
