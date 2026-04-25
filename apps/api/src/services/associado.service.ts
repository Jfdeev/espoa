import { db, associado } from "@espoa/database";
import { eq, and, isNull } from "drizzle-orm";

export async function createAssociado(data: {
  id?: string;
  associacaoId?: string | null;
  nome: string;
  cpf?: string | null;
  caf?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  comunidade?: string | null;
  contato?: string | null;
  dataEntrada: string;
  status?: string;
  deviceId?: string | null;
}) {
  if (data.cpf) {
    const existing = await db
      .select({ id: associado.id })
      .from(associado)
      .where(and(eq(associado.cpf, data.cpf), isNull(associado.deletedAt)))
      .limit(1);

    if (existing.length > 0) {
      return { error: "cpf_duplicado", existing: existing[0].id };
    }
  }

  const [created] = await db
    .insert(associado)
    .values({
      ...(data.id && { id: data.id }),
      associacaoId: data.associacaoId ?? null,
      nome: data.nome,
      cpf: data.cpf ?? null,
      caf: data.caf ?? null,
      telefone: data.telefone ?? null,
      endereco: data.endereco ?? null,
      comunidade: data.comunidade ?? null,
      contato: data.contato ?? null,
      dataEntrada: data.dataEntrada,
      status: data.status ?? "ativo",
      deviceId: data.deviceId ?? null,
    })
    .returning();

  return { data: created };
}

export async function listAssociados() {
  return db
    .select()
    .from(associado)
    .where(isNull(associado.deletedAt));
}

export async function getAssociado(id: string) {
  const [row] = await db
    .select()
    .from(associado)
    .where(and(eq(associado.id, id), isNull(associado.deletedAt)))
    .limit(1);

  return row ?? null;
}

export async function updateAssociado(
  id: string,
  data: Partial<{
    associacaoId: string | null;
    nome: string;
    cpf: string | null;
    caf: string | null;
    telefone: string | null;
    endereco: string | null;
    comunidade: string | null;
    contato: string | null;
    dataEntrada: string;
    status: string;
    deviceId: string | null;
  }>,
) {
  if (data.cpf) {
    const existing = await db
      .select({ id: associado.id })
      .from(associado)
      .where(
        and(
          eq(associado.cpf, data.cpf),
          isNull(associado.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0].id !== id) {
      return { error: "cpf_duplicado", existing: existing[0].id };
    }
  }

  const [updated] = await db
    .update(associado)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(associado.id, id), isNull(associado.deletedAt)))
    .returning();

  return updated ? { data: updated } : { error: "not_found" };
}

export async function deleteAssociado(id: string) {
  const now = new Date();
  const [deleted] = await db
    .update(associado)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(associado.id, id), isNull(associado.deletedAt)))
    .returning();

  return deleted ? { data: deleted } : { error: "not_found" };
}
