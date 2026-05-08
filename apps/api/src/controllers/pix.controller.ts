import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  listMensalidadesDoUsuario,
  createMensalidade,
  jaPagouMes,
} from "../services/mensalidade.service";
import { createPixBilling, checkBillingStatus, type WebhookPayload } from "../services/abacatepay.service";
import { toSnakeObject } from "../utils/case-mapper";
import type { Request } from "express";
import { db, usuario } from "@espoa/database";
import { eq } from "drizzle-orm";

/** GET /mensalidades/minha — mensalidades do usuário autenticado */
export async function getMensalidadesMinha(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const rows = await listMensalidadesDoUsuario(req.userId!);
    return res.json({
      mensalidades: rows.map((r) =>
        toSnakeObject(r as unknown as Record<string, unknown>),
      ),
    });
  } catch (err) {
    console.error("GET /mensalidades/minha error", err);
    return res.status(500).json({ error: "fetch_failed" });
  }
}

/** POST /pix/gerar — cria cobrança PIX para o usuário autenticado */
export async function gerarPix(req: AuthenticatedRequest, res: Response) {
  try {
    const { valor } = req.body as { valor?: number };

    if (!valor || typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
      return res.status(400).json({ error: "valor_invalido" });
    }

    // Bloqueia se já pagou no mês corrente
    const anoMesAtual = new Date().toISOString().slice(0, 7);
    if (await jaPagouMes(req.userId!, anoMesAtual)) {
      return res.status(409).json({ error: "ja_pago_no_mes" });
    }

    const appUrl = process.env.APP_URL ?? "https://espoa.app";

    // Fetch user name for AbacatePay customer (email already in req)
    const [userRow] = await db
      .select({ nome: usuario.nome, telefone: usuario.telefone, cpf: usuario.cpf })
      .from(usuario)
      .where(eq(usuario.id, req.userId!))
      .limit(1);

    const result = await createPixBilling({
      products: [
        {
          externalId: `mensalidade:${req.userId}:${Date.now()}`,
          name: "Mensalidade",
          description: "Mensalidade associação",
          quantity: 1,
          price: Math.round(valor * 100),
        },
      ],
      returnUrl: `${appUrl}/app/mensalidades`,
      completionUrl: `${appUrl}/app/mensalidades?pago=1`,
      customer: {
        name: userRow?.nome ?? req.email ?? "Associado",
        email: req.email ?? undefined,
        cellphone: userRow?.telefone ?? "00000000000",
        taxId: userRow?.cpf ?? "00000000000",
      },
    });

    if (result.error || !result.data) {
      console.error("AbacatePay billing failed:", result.error);
      return res.status(502).json({ error: result.error ?? "abacatepay_error" });
    }

    return res.status(201).json(result.data);
  } catch (err) {
    console.error("POST /pix/gerar error", err);
    return res.status(500).json({ error: "pix_failed" });
  }
}

/**
 * POST /pix/verificar — verifica manualmente status de um billing no AbacatePay.
 * Usado como fallback quando o webhook não chegou (dev local / ngrok offline).
 */
export async function verificarPix(req: AuthenticatedRequest, res: Response) {
  try {
    const { billingId } = req.body as { billingId?: string };
    if (!billingId) return res.status(400).json({ error: "billingId obrigatório" });

    const result = await checkBillingStatus(billingId);
    if (result.error) return res.status(502).json({ error: result.error });

    const PAID_STATUSES = ["PAID", "COMPLETED", "APPROVED", "paid", "completed"];
    if (!PAID_STATUSES.includes(result.status ?? "")) {
      return res.json({ pago: false, status: result.status });
    }

    // Evita registrar pagamento duplicado no mês
    const anoMesHoje = new Date().toISOString().slice(0, 7);
    if (await jaPagouMes(req.userId!, anoMesHoje)) {
      return res.json({ pago: true, status: result.status, aviso: "ja_registrado" });
    }

    // Registra o pagamento
    const valorReais = (result.amount ?? 0) / 100;
    const hoje = new Date().toISOString().slice(0, 10);
    await createMensalidade({
      usuarioId: req.userId!,
      valor: valorReais,
      dataPagamento: hoje,
      formaPagamento: "pix",
    });

    return res.json({ pago: true, status: result.status });
  } catch (err) {
    console.error("POST /pix/verificar error", err);
    return res.status(500).json({ error: "verificar_failed" });
  }
}

/**
 * POST /pix/webhook — recebe confirmação de pagamento do AbacatePay.
 * Rota pública (sem requireAuth) — autenticada pelo token de webhook.
 */
export async function pixWebhook(req: Request, res: Response) {
  try {
    const payload = req.body as WebhookPayload;
    if (payload.event !== "billing.paid") {
      return res.json({ ok: true });
    }

    const billing = payload.data?.billing;
    if (!billing) return res.status(400).json({ error: "payload_invalido" });

    // Extrai usuarioId do externalId: "mensalidade:<usuarioId>:<ts>"
    const product = billing.products?.[0];
    const externalId = product?.externalId ?? "";
    const parts = externalId.split(":");
    const usuarioId = parts[1];

    if (!usuarioId) {
      console.warn("pixWebhook: externalId sem usuarioId", externalId);
      return res.json({ ok: true });
    }

    const valorReais = (billing.amount ?? 0) / 100;
    const hoje = new Date().toISOString().slice(0, 10);

    await createMensalidade({
      usuarioId,
      valor: valorReais,
      dataPagamento: hoje,
      formaPagamento: "pix",
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("POST /pix/webhook error", err);
    return res.status(500).json({ error: "webhook_failed" });
  }
}
