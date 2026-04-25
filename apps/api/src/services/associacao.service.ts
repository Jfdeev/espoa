import { db, associacao } from "@espoa/database";
import { eq, and, isNull } from "drizzle-orm";

export async function createAssociacao(data: {
  id?: string;
  nome: string;
  cnpj: string;
  municipio: string;
  estado: string;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  status?: string;
  createdBy?: string | null;
  deviceId?: string | null;
}) {
  const existing = await db
    .select({ id: associacao.id })
    .from(associacao)
    .where(and(eq(associacao.cnpj, data.cnpj), isNull(associacao.deletedAt)))
    .limit(1);

  if (existing.length > 0) {
    return { error: "cnpj_duplicado", existing: existing[0].id };
  }

  const [created] = await db
    .insert(associacao)
    .values({
      ...(data.id && { id: data.id }),
      nome: data.nome,
      cnpj: data.cnpj,
      municipio: data.municipio,
      estado: data.estado,
      endereco: data.endereco ?? null,
      telefone: data.telefone ?? null,
      email: data.email ?? null,
      status: data.status ?? "ativa",
      createdBy: data.createdBy ?? null,
      deviceId: data.deviceId ?? null,
    })
    .returning();

  return { data: created };
}

export async function listAssociacoes() {
  return db
    .select()
    .from(associacao)
    .where(isNull(associacao.deletedAt));
}

export async function getAssociacao(id: string) {
  const [row] = await db
    .select()
    .from(associacao)
    .where(and(eq(associacao.id, id), isNull(associacao.deletedAt)))
    .limit(1);

  return row ?? null;
}

export async function updateAssociacao(
  id: string,
  data: Partial<{
    nome: string;
    cnpj: string | null;
    municipio: string;
    estado: string;
    endereco: string | null;
    telefone: string | null;
    email: string | null;
    status: string;
    deviceId: string | null;
  }>,
) {
  if (data.cnpj) {
    const existing = await db
      .select({ id: associacao.id })
      .from(associacao)
      .where(
        and(
          eq(associacao.cnpj, data.cnpj),
          isNull(associacao.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0].id !== id) {
      return { error: "cnpj_duplicado", existing: existing[0].id };
    }
  }

  const [updated] = await db
    .update(associacao)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(associacao.id, id), isNull(associacao.deletedAt)))
    .returning();

  return updated ? { data: updated } : { error: "not_found" };
}

export async function deleteAssociacao(id: string) {
  const now = new Date();
  const [deleted] = await db
    .update(associacao)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(associacao.id, id), isNull(associacao.deletedAt)))
    .returning();

  return deleted ? { data: deleted } : { error: "not_found" };
}
