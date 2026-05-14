import { db, transacaoFinanceira } from "@espoa/database";
import { and, eq, isNull } from "drizzle-orm";

export async function createTransacaoFinanceira(data: {
  id?: string;
  associacaoId?: string | null;
  tipo: string;
  valor: number;
  descricao?: string | null;
  documento?: string | null;
  data: string;
  deviceId?: string | null;
}) {
  const [created] = await db
    .insert(transacaoFinanceira)
    .values({
      ...(data.id && { id: data.id }),
      associacaoId: data.associacaoId ?? null,
      tipo: data.tipo,
      valor: data.valor,
      descricao: data.descricao ?? null,
      documento: data.documento ?? null,
      data: data.data,
      deviceId: data.deviceId ?? null,
    })
    .returning();

  return { data: created };
}

export async function listTransacoesFinanceiras() {
  return db
    .select()
    .from(transacaoFinanceira)
    .where(isNull(transacaoFinanceira.deletedAt));
}

export async function getTransacaoFinanceira(id: string) {
  const [row] = await db
    .select()
    .from(transacaoFinanceira)
    .where(
      and(
        eq(transacaoFinanceira.id, id),
        isNull(transacaoFinanceira.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function updateTransacaoFinanceira(
  id: string,
  data: Partial<{
    tipo: string;
    valor: number;
    descricao: string | null;
    documento: string | null;
    data: string;
    deviceId: string | null;
  }>,
) {
  const [updated] = await db
    .update(transacaoFinanceira)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(transacaoFinanceira.id, id),
        isNull(transacaoFinanceira.deletedAt),
      ),
    )
    .returning();

  return updated ? { data: updated } : { error: "not_found" };
}

export async function deleteTransacaoFinanceira(id: string) {
  const now = new Date();
  const [deleted] = await db
    .update(transacaoFinanceira)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(transacaoFinanceira.id, id),
        isNull(transacaoFinanceira.deletedAt),
      ),
    )
    .returning();

  return deleted ? { data: deleted } : { error: "not_found" };
}
