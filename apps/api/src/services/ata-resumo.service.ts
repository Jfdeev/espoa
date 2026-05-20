import { db, ata } from "@espoa/database";
import { and, eq, isNull } from "drizzle-orm";
import { generateText, isAiConfigured } from "../lib/llm";

const SYSTEM_PROMPT = `Você ajuda agricultores a entenderem rapidamente o que foi decidido em assembleias de associações rurais. Use linguagem simples, direta, sem jargão jurídico. Foque no que muda para o associado no dia a dia.`;

function buildPrompt(titulo: string, conteudo: string): string {
  return `Resuma a ata de assembleia abaixo em até 5 bullets curtos, dividindo em três seções:

**O que ficou decidido:** (pontos principais)
**O que muda para você:** (impactos práticos no associado)
**Próximos passos:** (ações futuras, datas, prazos)

Use no máximo 1-2 bullets por seção. Se uma seção não tiver conteúdo na ata, omita-a. Português do Brasil. Sem cumprimentos, sem rodeios — vá direto ao ponto.

Título: ${titulo}

Ata:
${conteudo}`;
}

export async function getOrGenerateAtaResumo(
  ataId: string,
): Promise<
  | { ok: true; resumo: string; cached: boolean }
  | { ok: false; reason: string }
> {
  const [row] = await db
    .select({
      id: ata.id,
      titulo: ata.titulo,
      conteudo: ata.conteudo,
      resumoIa: ata.resumoIa,
      associacaoId: ata.associacaoId,
    })
    .from(ata)
    .where(and(eq(ata.id, ataId), isNull(ata.deletedAt)))
    .limit(1);

  if (!row) return { ok: false, reason: "ata_nao_encontrada" };

  if (row.resumoIa && row.resumoIa.trim().length > 0) {
    return { ok: true, resumo: row.resumoIa, cached: true };
  }

  if (!isAiConfigured()) {
    return { ok: false, reason: "ia_nao_configurada" };
  }

  const resumo = await generateText({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(row.titulo, row.conteudo),
    maxTokens: 600,
  });

  if (!resumo) {
    return { ok: false, reason: "geracao_falhou" };
  }

  await db
    .update(ata)
    .set({ resumoIa: resumo, updatedAt: new Date() })
    .where(eq(ata.id, ataId));

  return { ok: true, resumo, cached: false };
}

/**
 * Retorna o associacaoId da ata para fins de autorização.
 */
export async function getAtaAssociacaoId(
  ataId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ associacaoId: ata.associacaoId })
    .from(ata)
    .where(and(eq(ata.id, ataId), isNull(ata.deletedAt)))
    .limit(1);
  return row?.associacaoId ?? null;
}
