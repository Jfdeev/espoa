import { db, usuario, usuarioAssociacao, associacao } from "@espoa/database";
import { and, eq } from "drizzle-orm";
import { sendNotificationEmail, emailTemplates } from "../lib/email";

/**
 * Notifica todos os membros ativos de uma associação sobre uma nova ata.
 * Fire-and-forget — não bloqueia o fluxo de criação da ata.
 */
export async function notifyMembersOfNewAta(params: {
  associacaoId: string;
  tituloAta: string;
  dataAta: string;
}): Promise<void> {
  try {
    const [assoc] = await db
      .select({ nome: associacao.nome })
      .from(associacao)
      .where(eq(associacao.id, params.associacaoId))
      .limit(1);

    if (!assoc) return;

    const membros = await db
      .select({
        email: usuario.email,
        nome: usuario.nome,
      })
      .from(usuarioAssociacao)
      .innerJoin(usuario, eq(usuario.id, usuarioAssociacao.usuarioId))
      .where(
        and(
          eq(usuarioAssociacao.associacaoId, params.associacaoId),
          eq(usuarioAssociacao.status, "ativo"),
        ),
      );

    for (const m of membros) {
      if (!m.email) continue;
      const tpl = emailTemplates.novaAta({
        nomeMembro: m.nome ?? "membro",
        nomeAssociacao: assoc.nome,
        tituloAta: params.tituloAta,
        dataAta: params.dataAta,
      });
      sendNotificationEmail({
        to: m.email,
        subject: tpl.subject,
        html: tpl.html,
      });
    }
  } catch (err) {
    console.error("[notifyMembersOfNewAta] erro:", err);
  }
}
