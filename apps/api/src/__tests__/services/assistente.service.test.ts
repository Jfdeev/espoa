import { describe, it, expect, vi, beforeEach } from "vitest";

const queryQueue: any[][] = [];
function nextResult() {
  return queryQueue.length > 0 ? queryQueue.shift() : [];
}

vi.mock("@espoa/database", () => {
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => {
          const result = nextResult();
          const promise: any = Promise.resolve(result);
          promise.limit = vi.fn(() => Promise.resolve(result));
          promise.orderBy = vi.fn(() => {
            const op: any = Promise.resolve(result);
            op.limit = vi.fn(() => Promise.resolve(result));
            return op;
          });
          return promise;
        }),
      })),
    })),
  };
  return {
    db,
    usuario: { id: "id", nome: "nome" },
    usuarioAssociacao: {
      id: "id",
      usuarioId: "usuario_id",
      associacaoId: "associacao_id",
      role: "role",
      status: "status",
    },
    associacao: { id: "id", nome: "nome" },
    mensalidade: {
      valor: "valor",
      dataPagamento: "data_pagamento",
      usuarioId: "usuario_id",
      associadoId: "associado_id",
      deletedAt: "deleted_at",
    },
    associado: {
      id: "id",
      usuarioId: "usuario_id",
      associacaoId: "associacao_id",
      deletedAt: "deleted_at",
    },
    ata: {
      titulo: "titulo",
      data: "data",
      resumoIa: "resumo_ia",
      associacaoId: "associacao_id",
      deletedAt: "deleted_at",
    },
    aviso: {
      titulo: "titulo",
      mensagem: "mensagem",
      associacaoId: "associacao_id",
      expiraEm: "expira_em",
      deletedAt: "deleted_at",
      updatedAt: "updated_at",
    },
    transacaoFinanceira: {
      tipo: "tipo",
      valor: "valor",
      data: "data",
      associacaoId: "associacao_id",
      deletedAt: "deleted_at",
    },
    editalPnae: {
      id: "id",
      associacaoId: "associacao_id",
      status: "status",
      dataLimite: "data_limite",
      deletedAt: "deleted_at",
    },
  };
});

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: any[]) => ({ and: args })),
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  isNull: vi.fn((a) => ({ isNull: a })),
  isNotNull: vi.fn((a) => ({ isNotNull: a })),
  desc: vi.fn((a) => ({ desc: a })),
  gt: vi.fn((a, b) => ({ gt: [a, b] })),
  gte: vi.fn((a, b) => ({ gte: [a, b] })),
  lte: vi.fn((a, b) => ({ lte: [a, b] })),
  or: vi.fn((...args: any[]) => ({ or: args })),
  inArray: vi.fn((a, b) => ({ inArray: [a, b] })),
}));

const generateChat = vi.fn();
vi.mock("../../lib/llm", () => ({
  isAiConfigured: vi.fn(() => true),
  generateChat: (...args: any[]) => generateChat(...args),
}));

import { askAssistente } from "../../services/assistente.service";
import { isAiConfigured } from "../../lib/llm";

const baseContext = () => {
  queryQueue.length = 0;
  // 1: usuario
  queryQueue.push([{ nome: "João Silva" }]);
  // 2: associacao
  queryQueue.push([{ nome: "Cooperativa Verde" }]);
  // 3: vinculo
  queryQueue.push([{ status: "ativo", role: "associado" }]);
  // 4: associados do usuário (legado)
  queryQueue.push([]);
  // 5: mensalidades
  queryQueue.push([{ dataPagamento: "2026-05-02" }]);
  // 6: avisos
  queryQueue.push([{ titulo: "Reunião", mensagem: "Sábado às 9h" }]);
  // 7: atas
  queryQueue.push([
    { titulo: "Assembleia maio", data: "2026-05-15", resumoIa: null },
  ]);
};

describe("askAssistente", () => {
  beforeEach(() => {
    queryQueue.length = 0;
    generateChat.mockReset();
    vi.mocked(isAiConfigured).mockReturnValue(true);
  });

  it("retorna mensagem_vazia para mensagem em branco", async () => {
    const result = await askAssistente({
      userId: "u",
      associacaoId: "a",
      message: "   ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("mensagem_vazia");
  });

  it("retorna mensagem_muito_longa para input > 1000 chars", async () => {
    const result = await askAssistente({
      userId: "u",
      associacaoId: "a",
      message: "a".repeat(1001),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("mensagem_muito_longa");
  });

  it("retorna ia_nao_configurada se GOOGLE_API_KEY ausente", async () => {
    vi.mocked(isAiConfigured).mockReturnValue(false);
    const result = await askAssistente({
      userId: "u",
      associacaoId: "a",
      message: "Olá",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ia_nao_configurada");
  });

  it("retorna acesso_negado_membro se vínculo não estiver ativo", async () => {
    queryQueue.push([{ nome: "João" }]); // usuario
    queryQueue.push([{ nome: "Coop" }]); // associacao
    queryQueue.push([{ status: "pendente", role: "associado" }]); // vinculo
    queryQueue.push([]); // associados
    queryQueue.push([]); // mensalidades
    queryQueue.push([]); // avisos
    queryQueue.push([]); // atas

    const result = await askAssistente({
      userId: "u",
      associacaoId: "a",
      message: "Olá",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("acesso_negado_membro");
  });

  it("retorna reply quando IA responde com sucesso", async () => {
    baseContext();
    generateChat.mockResolvedValue("Sua mensalidade está em dia este mês.");

    const result = await askAssistente({
      userId: "u",
      associacaoId: "a",
      message: "Minha mensalidade está paga?",
    });

    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.reply).toContain("mensalidade está em dia");
    expect(generateChat).toHaveBeenCalledOnce();
    // Confirma que o system prompt incluiu contexto pessoal
    const call = generateChat.mock.calls[0][0];
    expect(call.system).toContain("João Silva");
    expect(call.system).toContain("Cooperativa Verde");
  });

  it("inclui histórico anterior nas mensagens enviadas", async () => {
    baseContext();
    generateChat.mockResolvedValue("Resposta nova");

    await askAssistente({
      userId: "u",
      associacaoId: "a",
      message: "E o próximo passo?",
      history: [
        { role: "user", content: "Quando é a reunião?" },
        { role: "assistant", content: "Sábado às 9h." },
      ],
    });

    const call = generateChat.mock.calls[0][0];
    expect(call.messages).toHaveLength(3); // 2 history + 1 nova
    expect(call.messages[0].content).toBe("Quando é a reunião?");
    expect(call.messages[2].content).toBe("E o próximo passo?");
  });

  it("retorna geracao_falhou quando IA retorna null", async () => {
    baseContext();
    generateChat.mockResolvedValue(null);

    const result = await askAssistente({
      userId: "u",
      associacaoId: "a",
      message: "Oi",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("geracao_falhou");
  });

  it("limita o histórico ao máximo de 20 mensagens", async () => {
    baseContext();
    generateChat.mockResolvedValue("ok");

    const history = Array.from({ length: 50 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `msg ${i}`,
    }));

    await askAssistente({
      userId: "u",
      associacaoId: "a",
      message: "nova",
      history,
    });

    const call = generateChat.mock.calls[0][0];
    // 20 últimas do histórico + 1 nova
    expect(call.messages).toHaveLength(21);
    // A primeira deve ser msg 30 (50 - 20)
    expect(call.messages[0].content).toBe("msg 30");
  });

  it("inclui contexto administrativo no system prompt quando role é adm", async () => {
    queryQueue.length = 0;
    // — caminho member padrão (loadUserContext) —
    queryQueue.push([{ nome: "Maria Admin" }]); // 1: usuario
    queryQueue.push([{ nome: "Cooperativa Verde" }]); // 2: associacao
    queryQueue.push([{ status: "ativo", role: "adm" }]); // 3: vinculo
    queryQueue.push([]); // 4: associados do usuário
    queryQueue.push([{ dataPagamento: "2026-05-02" }]); // 5: mensalidades pessoais
    queryQueue.push([{ titulo: "Reunião", mensagem: "Sábado" }]); // 6: avisos
    queryQueue.push([
      { titulo: "Assembleia", data: "2026-05-15", resumoIa: null },
    ]); // 7: atas

    // — caminho admin (loadAdminContext) —
    // 8: vinculos (status + usuarioId) — 3 ativos, 1 pendente
    queryQueue.push([
      { status: "ativo", usuarioId: "u1" },
      { status: "ativo", usuarioId: "u2" },
      { status: "ativo", usuarioId: "u3" },
      { status: "pendente", usuarioId: "u4" },
    ]);
    // 9: associados cadastrados na associação (legado)
    queryQueue.push([{ id: "a1" }, { id: "a2" }]);
    // 10: transações do mês (1 receita 1500, 1 despesa 600)
    queryQueue.push([
      { tipo: "receita", valor: 1500 },
      { tipo: "despesa", valor: 600 },
    ]);
    // 11: mensalidades pagas no mês (2 pagamentos de 50)
    queryQueue.push([{ valor: 50 }, { valor: 50 }]);
    // 12: editais abertos (1)
    queryQueue.push([{ id: "e1" }]);

    generateChat.mockResolvedValue("Aqui está o panorama.");

    const result = await askAssistente({
      userId: "u",
      associacaoId: "a",
      message: "Quantos associados ativos temos?",
    });

    expect(result.ok).toBe(true);
    const call = generateChat.mock.calls[0][0];
    // Bloco administrativo presente
    expect(call.system).toContain("CONTEXTO ADMINISTRATIVO");
    expect(call.system).toContain("Membros com vínculo ativo: 3");
    expect(call.system).toContain("Solicitações de vínculo pendentes: 1");
    expect(call.system).toContain("Editais PNAE abertos no momento: 1");
    // Financeiro: arrecadou 1500, gastou 600, saldo 900
    expect(call.system).toMatch(/saldo[^\n]*900/);
    // Mensalidades: 2 pagamentos
    expect(call.system).toContain("Mensalidades pagas neste mês: 2");
  });

  it("NÃO inclui contexto administrativo para associado comum", async () => {
    baseContext();
    generateChat.mockResolvedValue("ok");

    await askAssistente({
      userId: "u",
      associacaoId: "a",
      message: "Quantos associados ativos temos?",
    });

    const call = generateChat.mock.calls[0][0];
    expect(call.system).not.toContain("CONTEXTO ADMINISTRATIVO");
  });
});
