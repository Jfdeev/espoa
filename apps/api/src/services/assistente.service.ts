import {
  db,
  usuario,
  usuarioAssociacao,
  associacao,
  mensalidade,
  associado,
  ata,
  aviso,
  transacaoFinanceira,
  editalPnae,
} from "@espoa/database";
import {
  and,
  eq,
  isNotNull,
  isNull,
  desc,
  gt,
  gte,
  lte,
  or,
  inArray,
} from "drizzle-orm";
import {
  generateChat,
  isAiConfigured,
  type ChatMessage,
} from "../lib/llm";

const MAX_HISTORY_MESSAGES = 20;
const MAX_USER_MESSAGE_LENGTH = 1000;

const SYSTEM_PROMPT_BASE = `Você é o assistente do app Espoá, dedicado a ajudar associados de cooperativas rurais brasileiras.

REGRAS IMPORTANTES:
- Responda APENAS perguntas relacionadas a: vida na associação (mensalidades, atas, avisos, vínculo), gestão da cooperativa, programa PNAE, e dúvidas práticas de agricultura familiar relacionadas ao contexto da associação.
- Use linguagem simples, direta, calorosa. Nada de jargão.
- Se a pergunta estiver fora desses temas (esportes, política, tecnologia, etc), recuse educadamente em 1 frase e sugira voltar ao tema da associação.
- Use os dados de contexto fornecidos para personalizar respostas. NÃO invente números ou datas.
- Se não tiver informação suficiente, diga isso honestamente.
- Mantenha respostas curtas (2-4 frases na maioria dos casos).
- Português do Brasil. Trate por "você".`;

interface AdminContext {
  totalMembrosAtivos: number;
  totalMembrosPendentes: number;
  totalAssociadosCadastrados: number;
  financeiroMesAtual: {
    arrecadado: number;
    gasto: number;
    saldo: number;
  };
  mensalidadesMesAtual: {
    pagas: number;
    valorArrecadado: number;
  };
  editaisAbertos: number;
}

interface UserContext {
  nomeMembro: string;
  nomeAssociacao: string;
  statusVinculo: string;
  roleVinculo: string;
  mensalidadePaga: boolean;
  ultimaMensalidade: string | null;
  totalAvisosAtivos: number;
  ultimosAvisos: Array<{ titulo: string; mensagem: string }>;
  ultimasAtas: Array<{ titulo: string; data: string; resumo?: string | null }>;
  admin?: AdminContext;
}

/**
 * Carrega contexto agregado da associação para administradores.
 * Roda apenas se `role === "adm"` — para associados comuns esses dados
 * não são úteis e custariam queries extras desnecessárias.
 */
async function loadAdminContext(
  associacaoId: string,
): Promise<AdminContext> {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const inicioMes = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const fimMes = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  const hojeStr = hoje.toISOString().slice(0, 10);

  // Vínculos da associação — conta ativos e pendentes numa única query
  const vinculos = await db
    .select({
      status: usuarioAssociacao.status,
      usuarioId: usuarioAssociacao.usuarioId,
    })
    .from(usuarioAssociacao)
    .where(eq(usuarioAssociacao.associacaoId, associacaoId));

  let totalMembrosAtivos = 0;
  let totalMembrosPendentes = 0;
  const usuarioIdsAtivos: string[] = [];
  for (const v of vinculos) {
    if (v.status === "ativo") {
      totalMembrosAtivos++;
      if (v.usuarioId) usuarioIdsAtivos.push(v.usuarioId);
    } else if (v.status === "pendente") {
      totalMembrosPendentes++;
    }
  }

  // Associados cadastrados (registro legado por associação)
  const associadosCadastrados = await db
    .select({ id: associado.id })
    .from(associado)
    .where(
      and(eq(associado.associacaoId, associacaoId), isNull(associado.deletedAt)),
    );
  const associadoIds = associadosCadastrados.map((a) => a.id);

  // Financeiro do mês corrente
  const transacoes = await db
    .select({
      tipo: transacaoFinanceira.tipo,
      valor: transacaoFinanceira.valor,
    })
    .from(transacaoFinanceira)
    .where(
      and(
        eq(transacaoFinanceira.associacaoId, associacaoId),
        gte(transacaoFinanceira.data, inicioMes),
        lte(transacaoFinanceira.data, fimMes),
        isNull(transacaoFinanceira.deletedAt),
      ),
    );
  let arrecadado = 0;
  let gasto = 0;
  for (const t of transacoes) {
    const v = Number(t.valor) || 0;
    if (t.tipo === "despesa") gasto += v;
    else arrecadado += v;
  }

  // Mensalidades pagas no mês — cobre usuário direto OU associado legado
  let mensalidadesPagas = 0;
  let valorMensalidadesArrecadado = 0;
  const condicoesOwnership: any[] = [];
  if (usuarioIdsAtivos.length > 0) {
    condicoesOwnership.push(inArray(mensalidade.usuarioId, usuarioIdsAtivos));
  }
  if (associadoIds.length > 0) {
    condicoesOwnership.push(inArray(mensalidade.associadoId, associadoIds));
  }
  if (condicoesOwnership.length > 0) {
    const ownership =
      condicoesOwnership.length === 1
        ? condicoesOwnership[0]
        : or(...condicoesOwnership);
    const pagas = await db
      .select({ valor: mensalidade.valor })
      .from(mensalidade)
      .where(
        and(
          ownership!,
          isNotNull(mensalidade.dataPagamento),
          gte(mensalidade.dataPagamento, inicioMes),
          lte(mensalidade.dataPagamento, fimMes),
          isNull(mensalidade.deletedAt),
        ),
      );
    mensalidadesPagas = pagas.length;
    valorMensalidadesArrecadado = pagas.reduce(
      (acc, m) => acc + (Number(m.valor) || 0),
      0,
    );
  }

  // Editais PNAE abertos (status="aberto" e prazo ainda vigente)
  const editaisAbertosRows = await db
    .select({ id: editalPnae.id })
    .from(editalPnae)
    .where(
      and(
        eq(editalPnae.associacaoId, associacaoId),
        eq(editalPnae.status, "aberto"),
        gte(editalPnae.dataLimite, hojeStr),
        isNull(editalPnae.deletedAt),
      ),
    );

  return {
    totalMembrosAtivos,
    totalMembrosPendentes,
    totalAssociadosCadastrados: associadosCadastrados.length,
    financeiroMesAtual: {
      arrecadado,
      gasto,
      saldo: arrecadado - gasto,
    },
    mensalidadesMesAtual: {
      pagas: mensalidadesPagas,
      valorArrecadado: valorMensalidadesArrecadado,
    },
    editaisAbertos: editaisAbertosRows.length,
  };
}

async function loadUserContext(
  userId: string,
  associacaoId: string,
): Promise<UserContext | null> {
  const [usr] = await db
    .select({ nome: usuario.nome })
    .from(usuario)
    .where(eq(usuario.id, userId))
    .limit(1);
  if (!usr) return null;

  const [assoc] = await db
    .select({ nome: associacao.nome })
    .from(associacao)
    .where(eq(associacao.id, associacaoId))
    .limit(1);
  if (!assoc) return null;

  const [vinculo] = await db
    .select({
      status: usuarioAssociacao.status,
      role: usuarioAssociacao.role,
    })
    .from(usuarioAssociacao)
    .where(
      and(
        eq(usuarioAssociacao.usuarioId, userId),
        eq(usuarioAssociacao.associacaoId, associacaoId),
      ),
    )
    .limit(1);

  // Mensalidades: pega a mais recente do usuário ou via associado legado
  const associados = await db
    .select({ id: associado.id })
    .from(associado)
    .where(and(eq(associado.usuarioId, userId), isNull(associado.deletedAt)));
  const associadoIds = associados.map((a) => a.id);

  const ownership =
    associadoIds.length > 0
      ? or(
          eq(mensalidade.usuarioId, userId),
          inArray(mensalidade.associadoId, associadoIds),
        )
      : eq(mensalidade.usuarioId, userId);

  const mensalidades = await db
    .select({
      dataPagamento: mensalidade.dataPagamento,
    })
    .from(mensalidade)
    .where(
      and(
        ownership!,
        isNull(mensalidade.deletedAt),
        isNotNull(mensalidade.dataPagamento),
      ),
    )
    .orderBy(desc(mensalidade.dataPagamento))
    .limit(1);

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const mensalidadePaga =
    !!mensalidades[0]?.dataPagamento &&
    mensalidades[0].dataPagamento.slice(0, 7) === mesAtual;

  // Avisos ativos
  const avisos = await db
    .select({
      titulo: aviso.titulo,
      mensagem: aviso.mensagem,
    })
    .from(aviso)
    .where(
      and(
        eq(aviso.associacaoId, associacaoId),
        isNull(aviso.deletedAt),
        or(isNull(aviso.expiraEm), gt(aviso.expiraEm, hoje))!,
      ),
    )
    .orderBy(desc(aviso.updatedAt))
    .limit(5);

  // Últimas 5 atas (com resumo se disponível)
  const atas = await db
    .select({
      titulo: ata.titulo,
      data: ata.data,
      resumoIa: ata.resumoIa,
    })
    .from(ata)
    .where(and(eq(ata.associacaoId, associacaoId), isNull(ata.deletedAt)))
    .orderBy(desc(ata.data))
    .limit(5);

  // Contexto agregado da associação só para administradores — economiza
  // queries para o caminho do associado comum.
  const adminContext =
    vinculo?.role === "adm" ? await loadAdminContext(associacaoId) : undefined;

  return {
    nomeMembro: usr.nome ?? "associado(a)",
    nomeAssociacao: assoc.nome,
    statusVinculo: vinculo?.status ?? "desconhecido",
    roleVinculo: vinculo?.role ?? "associado",
    mensalidadePaga,
    ultimaMensalidade: mensalidades[0]?.dataPagamento ?? null,
    totalAvisosAtivos: avisos.length,
    ultimosAvisos: avisos.map((a) => ({
      titulo: a.titulo,
      mensagem: a.mensagem,
    })),
    ultimasAtas: atas.map((a) => ({
      titulo: a.titulo,
      data: a.data,
      resumo: a.resumoIa,
    })),
    admin: adminContext,
  };
}

function buildSystemPrompt(ctx: UserContext): string {
  const avisosBlock = ctx.ultimosAvisos.length
    ? ctx.ultimosAvisos
        .map(
          (a, i) =>
            `[Aviso ${i + 1}] ${a.titulo}: ${a.mensagem.slice(0, 200)}`,
        )
        .join("\n")
    : "Nenhum aviso ativo no momento.";

  const atasBlock = ctx.ultimasAtas.length
    ? ctx.ultimasAtas
        .map((a, i) => {
          const resumo = a.resumo
            ? `\n  Resumo: ${a.resumo.slice(0, 300)}`
            : "";
          return `[Ata ${i + 1}] ${a.titulo} (${a.data})${resumo}`;
        })
        .join("\n")
    : "Nenhuma ata registrada recentemente.";

  const brl = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const adminBlock = ctx.admin
    ? `

CONTEXTO ADMINISTRATIVO DA ASSOCIAÇÃO (somente porque o usuário é administrador):
- Membros com vínculo ativo: ${ctx.admin.totalMembrosAtivos}
- Solicitações de vínculo pendentes: ${ctx.admin.totalMembrosPendentes}
- Associados cadastrados (registro legado): ${ctx.admin.totalAssociadosCadastrados}
- Financeiro do mês corrente: arrecadou ${brl(ctx.admin.financeiroMesAtual.arrecadado)}, gastou ${brl(ctx.admin.financeiroMesAtual.gasto)}, saldo ${brl(ctx.admin.financeiroMesAtual.saldo)}
- Mensalidades pagas neste mês: ${ctx.admin.mensalidadesMesAtual.pagas} pagamentos (${brl(ctx.admin.mensalidadesMesAtual.valorArrecadado)})
- Editais PNAE abertos no momento: ${ctx.admin.editaisAbertos}

REGRAS EXTRAS PARA ADMIN:
- Pode responder perguntas sobre números agregados da associação acima.
- Não revele dados pessoais de outros membros (nomes, CPFs, telefones) — você não tem esses dados de qualquer forma.
- Se a pergunta exigir dado pessoal específico de outro membro, oriente a consultar a tela correspondente no app.`
    : "";

  return `${SYSTEM_PROMPT_BASE}

CONTEXTO DO USUÁRIO:
- Nome: ${ctx.nomeMembro}
- Associação: ${ctx.nomeAssociacao}
- Tipo de vínculo: ${ctx.roleVinculo === "adm" ? "administrador" : "associado"}
- Status do vínculo: ${ctx.statusVinculo}
- Mensalidade do mês atual: ${ctx.mensalidadePaga ? "paga" : "ainda não paga"}
- Última mensalidade registrada: ${ctx.ultimaMensalidade ?? "nenhuma"}

AVISOS ATIVOS:
${avisosBlock}

ATAS RECENTES (com resumos quando disponíveis):
${atasBlock}${adminBlock}`;
}

export interface AssistenteResult {
  ok: true;
  reply: string;
}

export interface AssistenteError {
  ok: false;
  reason: string;
}

export async function askAssistente(params: {
  userId: string;
  associacaoId: string;
  message: string;
  history?: ChatMessage[];
}): Promise<AssistenteResult | AssistenteError> {
  const { userId, associacaoId, message, history = [] } = params;

  if (!message || !message.trim()) {
    return { ok: false, reason: "mensagem_vazia" };
  }
  if (message.length > MAX_USER_MESSAGE_LENGTH) {
    return { ok: false, reason: "mensagem_muito_longa" };
  }

  if (!isAiConfigured()) {
    return { ok: false, reason: "ia_nao_configurada" };
  }

  const ctx = await loadUserContext(userId, associacaoId);
  if (!ctx) return { ok: false, reason: "contexto_indisponivel" };
  if (ctx.statusVinculo !== "ativo") {
    return { ok: false, reason: "acesso_negado_membro" };
  }

  const sanitizedHistory = history
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0,
    )
    .slice(-MAX_HISTORY_MESSAGES);

  const messages: ChatMessage[] = [
    ...sanitizedHistory,
    { role: "user", content: message.trim() },
  ];

  const reply = await generateChat({
    system: buildSystemPrompt(ctx),
    messages,
    maxTokens: 500,
  });

  if (!reply) return { ok: false, reason: "geracao_falhou" };

  return { ok: true, reply };
}
