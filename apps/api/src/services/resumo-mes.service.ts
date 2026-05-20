import { generateText, isAiConfigured } from "../lib/llm";
import { resolvePeriod } from "../utils/period";
import { getTransparencia, isMembroAtivo } from "./transparencia.service";

const SYSTEM_PROMPT = `Você fala diretamente com agricultores associados a uma cooperativa rural brasileira. Use linguagem simples, direta, calorosa, sem jargão financeiro. Trate o usuário por "você". Não invente números — use apenas os fornecidos.`;

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function cacheKey(userId: string, associacaoId: string, anoMes: string): string {
  return `${userId}|${associacaoId}|${anoMes}`;
}

function getFromCache(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setInCache(key: string, value: string): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

const brl = (cents: number) =>
  cents.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function getResumoMes(params: {
  userId: string;
  associacaoId: string;
  nomeMembro: string;
  nomeAssociacao: string;
}): Promise<
  | { ok: true; resumo: string; cached: boolean }
  | { ok: false; reason: string }
> {
  const { userId, associacaoId, nomeMembro, nomeAssociacao } = params;

  const membro = await isMembroAtivo(userId, associacaoId);
  if (!membro) return { ok: false, reason: "acesso_negado_membro" };

  const periodo = resolvePeriod({ periodo: "mensal" });
  const anoMes = periodo.inicio.slice(0, 7);

  const key = cacheKey(userId, associacaoId, anoMes);
  const cached = getFromCache(key);
  if (cached) return { ok: true, resumo: cached, cached: true };

  if (!isAiConfigured()) {
    return { ok: false, reason: "ia_nao_configurada" };
  }

  const transparencia = await getTransparencia({
    userId,
    associacaoId,
    periodo,
  });

  const { resumo: dados } = transparencia;

  const prompt = `Gere um pequeno relato (3-4 frases curtas) chamado "Seu mês na associação" para o(a) associado(a) abaixo.

Nome: ${nomeMembro}
Associação: ${nomeAssociacao}
Mês de referência: ${periodo.inicio} a ${periodo.fim}

Dados do mês:
- Sua contribuição em mensalidades: ${brl(dados.suaContribuicao)}
- Total arrecadado pela associação: ${brl(dados.totalArrecadado)}
- Total gasto pela associação: ${brl(dados.totalGasto)}
- Saldo do período: ${brl(dados.saldoPeriodo)}
- Categorias com mais gastos: ${transparencia.distribuicaoGastos
    .slice(0, 3)
    .map((d) => `${d.categoria} (${d.percentual}%)`)
    .join(", ") || "nenhuma"}

Comece comprimentando pelo nome. Mostre quanto a pessoa contribuiu e como o dinheiro foi usado. Termine com uma frase de incentivo simples, sem ser piegas. Sem cumprimentos formais tipo "prezado(a)", apenas use "Olá, [Nome]!". Não use marcadores nem emojis.`;

  const text = await generateText({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 350,
  });

  if (!text) return { ok: false, reason: "geracao_falhou" };

  setInCache(key, text);
  return { ok: true, resumo: text, cached: false };
}
