import { db, editalPnae } from "@espoa/database";
import { eq, and, isNull } from "drizzle-orm";

export type ListEditalPnaeFilters = {
  associacaoId?: string;
  status?: string;
  municipio?: string;
};

export async function createEditalPnae(data: {
  id?: string;
  associacaoId: string;
  titulo: string;
  numeroEdital?: string | null;
  orgaoResponsavel?: string | null;
  descricao?: string | null;
  municipio?: string | null;
  estado?: string | null;
  dataAbertura?: string | null;
  dataLimite: string;
  valorTotalEstimado?: number | null;
  linkOriginal?: string | null;
  observacoesInternas?: string | null;
  status?: string;
  createdBy?: string | null;
  deviceId?: string | null;
}) {
  const [created] = await db
    .insert(editalPnae)
    .values({
      ...(data.id && { id: data.id }),
      associacaoId: data.associacaoId,
      titulo: data.titulo,
      numeroEdital: data.numeroEdital ?? null,
      orgaoResponsavel: data.orgaoResponsavel ?? null,
      descricao: data.descricao ?? null,
      municipio: data.municipio ?? null,
      estado: data.estado ?? null,
      dataAbertura: data.dataAbertura ?? null,
      dataLimite: data.dataLimite,
      valorTotalEstimado: data.valorTotalEstimado ?? null,
      linkOriginal: data.linkOriginal ?? null,
      observacoesInternas: data.observacoesInternas ?? null,
      status: data.status ?? "aberto",
      createdBy: data.createdBy ?? null,
      deviceId: data.deviceId ?? null,
    })
    .returning();

  return { data: created };
}

export async function listEditaisPnae(filters: ListEditalPnaeFilters = {}) {
  const conditions = [isNull(editalPnae.deletedAt)];

  if (filters.associacaoId) {
    conditions.push(eq(editalPnae.associacaoId, filters.associacaoId));
  }
  if (filters.status) {
    conditions.push(eq(editalPnae.status, filters.status));
  }
  if (filters.municipio) {
    conditions.push(eq(editalPnae.municipio, filters.municipio));
  }

  return db
    .select()
    .from(editalPnae)
    .where(and(...conditions));
}

export async function getEditalPnae(id: string) {
  const [row] = await db
    .select()
    .from(editalPnae)
    .where(and(eq(editalPnae.id, id), isNull(editalPnae.deletedAt)))
    .limit(1);

  return row ?? null;
}

export async function updateEditalPnae(
  id: string,
  data: Partial<{
    associacaoId: string;
    titulo: string;
    numeroEdital: string | null;
    orgaoResponsavel: string | null;
    descricao: string | null;
    municipio: string | null;
    estado: string | null;
    dataAbertura: string | null;
    dataLimite: string;
    valorTotalEstimado: number | null;
    linkOriginal: string | null;
    observacoesInternas: string | null;
    status: string;
    deviceId: string | null;
  }>,
) {
  const [updated] = await db
    .update(editalPnae)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(editalPnae.id, id), isNull(editalPnae.deletedAt)))
    .returning();

  return updated ? { data: updated } : { error: "not_found" as const };
}

export async function deleteEditalPnae(id: string) {
  const now = new Date();
  const [deleted] = await db
    .update(editalPnae)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(editalPnae.id, id), isNull(editalPnae.deletedAt)))
    .returning();

  return deleted ? { data: deleted } : { error: "not_found" as const };
}
