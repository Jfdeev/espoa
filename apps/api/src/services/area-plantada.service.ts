import { db, areaPlantada, associado } from "@espoa/database";
import { eq, and, isNull } from "drizzle-orm";

export async function createAreaPlantada(data: {
  id?: string;
  associadoId: string;
  cultura: string;
  areaHa: number;
  dataReferencia: string;
  observacao?: string | null;
  deviceId?: string | null;
}) {
  const [created] = await db
    .insert(areaPlantada)
    .values({
      ...(data.id && { id: data.id }),
      associadoId: data.associadoId,
      cultura: data.cultura,
      areaHa: data.areaHa,
      dataReferencia: data.dataReferencia,
      observacao: data.observacao ?? null,
      deviceId: data.deviceId ?? null,
    })
    .returning();

  return { data: created };
}

export async function listAreasPlantadas(associacaoId?: string) {
  if (associacaoId) {
    return db
      .select({
        id: areaPlantada.id,
        associadoId: areaPlantada.associadoId,
        cultura: areaPlantada.cultura,
        areaHa: areaPlantada.areaHa,
        dataReferencia: areaPlantada.dataReferencia,
        observacao: areaPlantada.observacao,
        version: areaPlantada.version,
        updatedAt: areaPlantada.updatedAt,
        deviceId: areaPlantada.deviceId,
        deletedAt: areaPlantada.deletedAt,
      })
      .from(areaPlantada)
      .innerJoin(associado, eq(areaPlantada.associadoId, associado.id))
      .where(and(isNull(areaPlantada.deletedAt), eq(associado.associacaoId, associacaoId)));
  }
  return db
    .select()
    .from(areaPlantada)
    .where(isNull(areaPlantada.deletedAt));
}

export async function getAreaPlantada(id: string) {
  const [row] = await db
    .select()
    .from(areaPlantada)
    .where(and(eq(areaPlantada.id, id), isNull(areaPlantada.deletedAt)))
    .limit(1);

  return row ?? null;
}

export async function updateAreaPlantada(
  id: string,
  data: Partial<{
    associadoId: string;
    cultura: string;
    areaHa: number;
    dataReferencia: string;
    observacao: string | null;
    deviceId: string | null;
  }>,
) {
  const [updated] = await db
    .update(areaPlantada)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(areaPlantada.id, id), isNull(areaPlantada.deletedAt)))
    .returning();

  return updated ? { data: updated } : { error: "not_found" };
}

export async function deleteAreaPlantada(id: string) {
  const now = new Date();
  const [deleted] = await db
    .update(areaPlantada)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(areaPlantada.id, id), isNull(areaPlantada.deletedAt)))
    .returning();

  return deleted ? { data: deleted } : { error: "not_found" };
}
