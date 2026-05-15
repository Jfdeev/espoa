import { db, mensalidade, associado } from "@espoa/database";
import { and, eq, isNull, sql } from "drizzle-orm";

export async function getAssociadoPorUsuario(usuarioId: string) {
  const [row] = await db
    .select()
    .from(associado)
    .where(and(eq(associado.usuarioId, usuarioId), isNull(associado.deletedAt)))
    .limit(1);

  return row ?? null;
}

function mensalidadeBaseQuery(field: "usuarioId" | "associadoId", value: string) {
  return db
    .select()
    .from(mensalidade)
    .where(and(eq(mensalidade[field], value), isNull(mensalidade.deletedAt)));
}

/** Busca mensalidades pelo usuarioId (novo padrão) */
export async function listMensalidadesDoUsuario(usuarioId: string) {
  return mensalidadeBaseQuery("usuarioId", usuarioId);
}

/** @deprecated use listMensalidadesDoUsuario */
export async function listMensalidadesDoAssociado(associadoId: string) {
  return mensalidadeBaseQuery("associadoId", associadoId);
}

/**
 * Verifica se o usuário já tem pagamento registrado no mês/ano informados.
 * anoMes formato: 'YYYY-MM'
 */
export async function jaPagouMes(
  usuarioId: string,
  anoMes: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: mensalidade.id })
    .from(mensalidade)
    .where(
      and(
        eq(mensalidade.usuarioId, usuarioId),
        isNull(mensalidade.deletedAt),
        sql`to_char(${mensalidade.dataPagamento}, 'YYYY-MM') = ${anoMes}`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function associadoExiste(associadoId: string) {
  const row = await db
    .select({ id: associado.id })
    .from(associado)
    .where(and(eq(associado.id, associadoId), isNull(associado.deletedAt)))
    .limit(1);

  return row.length > 0;
}

export async function createMensalidade(data: {
  id?: string;
  associadoId?: string | null;
  usuarioId?: string | null;
  valor: number;
  dataPagamento?: string | null;
  formaPagamento?: string | null;
  deviceId?: string | null;
}) {
  // Valida associadoId apenas quando fornecido
  if (data.associadoId) {
    const valido = await associadoExiste(data.associadoId);
    if (!valido) {
      return { error: "associado_inexistente" };
    }
  }

  if (!data.associadoId && !data.usuarioId) {
    return { error: "associado_id_ou_usuario_id_obrigatorio" };
  }

  // Impede pagamento duplicado no mesmo mês (apenas para pagamentos por usuarioId)
  if (data.usuarioId && data.dataPagamento) {
    const anoMes = data.dataPagamento.slice(0, 7);
    const jaPagou = await jaPagouMes(data.usuarioId, anoMes);
    if (jaPagou) {
      return { error: "ja_pago_no_mes" };
    }
  }

  const [created] = await db
    .insert(mensalidade)
    .values({
      ...(data.id && { id: data.id }),
      associadoId: data.associadoId ?? null,
      usuarioId: data.usuarioId ?? null,
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
    associadoId: string | null;
    usuarioId: string | null;
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

