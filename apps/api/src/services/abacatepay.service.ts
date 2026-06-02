/**
 * AbacatePay service — PIX billing via https://api.abacatepay.com/v1
 *
 * Docs: https://abacatepay.readme.io/reference/postbillingcreate
 * Auth: Authorization: Bearer <ABACATEPAY_API_KEY>
 */

const ABACATEPAY_BASE = "https://api.abacatepay.com/v1";

function apiKey() {
  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) throw new Error("ABACATEPAY_API_KEY não configurada");
  return key;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey()}`,
  };
}

export interface AbacatePayProduct {
  externalId: string;
  name: string;
  description?: string;
  quantity: number;
  /** Preço em centavos (mínimo 100 = R$ 1,00) */
  price: number;
}

export interface AbacatePayCustomer {
  name: string;
  cellphone?: string;
  email?: string;
  /** CPF sem pontuação */
  taxId?: string;
}

export interface CreateBillingParams {
  products: AbacatePayProduct[];
  returnUrl: string;
  completionUrl: string;
  customer?: AbacatePayCustomer;
  customerId?: string;
}

export interface BillingData {
  id: string;
  url: string;
  amount: number;
  status: string;
  pixQrCode?: string;
  pixCode?: string;
  methods: string[];
  frequency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillingResult {
  data?: BillingData;
  error?: string;
}

export async function createPixBilling(
  params: CreateBillingParams,
): Promise<CreateBillingResult> {
  const body = JSON.stringify({
    frequency: "ONE_TIME",
    methods: ["PIX"],
    products: params.products,
    returnUrl: params.returnUrl,
    completionUrl: params.completionUrl,
    ...(params.customer && { customer: params.customer }),
    ...(params.customerId && { customerId: params.customerId }),
  });

  try {
    const res = await fetch(`${ABACATEPAY_BASE}/billing/create`, {
      method: "POST",
      headers: headers(),
      body,
    });

    const text = await res.text();
    let json: { data?: BillingData; error?: string };
    try {
      json = JSON.parse(text);
    } catch {
      console.error("AbacatePay non-JSON response:", text);
      return { error: `abacatepay_error_${res.status}` };
    }

    if (!res.ok) {
      console.error("AbacatePay error response:", res.status, json);
      return { error: json.error ?? `abacatepay_error_${res.status}` };
    }

    return { data: json.data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("AbacatePay createPixBilling network error:", msg);
    return { error: `abacatepay_network_error: ${msg}` };
  }
}

export interface WebhookPayload {
  event: string;
  data: {
    billing: BillingData & {
      products?: AbacatePayProduct[];
    };
  };
}

export async function checkBillingStatus(
  billingId: string,
): Promise<{ status?: string; amount?: number; error?: string }> {
  try {
    // Tenta primeiro pelo endpoint direto (mais confiável)
    const resDirect = await fetch(
      `${ABACATEPAY_BASE}/billing/get?id=${encodeURIComponent(billingId)}`,
      { headers: headers() },
    );

    if (resDirect.ok) {
      const textDirect = await resDirect.text();
      try {
        const json = JSON.parse(textDirect) as { data?: BillingData; error?: string };
        if (json.data) return { status: json.data.status, amount: json.data.amount };
      } catch {
        // não era JSON, cai para o fallback abaixo
      }
    }

    // Fallback: lista todos e filtra pelo id
    const res = await fetch(`${ABACATEPAY_BASE}/billing/list`, {
      headers: headers(),
    });

    const text = await res.text();
    let json: { data?: BillingData[]; error?: string };
    try {
      json = JSON.parse(text);
    } catch {
      return { error: `abacatepay_error_${res.status}` };
    }

    if (!res.ok) return { error: json.error ?? `abacatepay_error_${res.status}` };

    const billing = json.data?.find((b) => b.id === billingId);
    if (!billing) return { error: "billing_not_found" };

    return { status: billing.status, amount: billing.amount };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `abacatepay_network_error: ${msg}` };
  }
}
