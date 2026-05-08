import type { Mensalidade } from "@/database/types";

/**
 * Retorna o primeiro dia útil (seg–sex) do mês informado.
 * Se o dia 1 cair no sábado → retorna o dia 3 (segunda).
 * Se cair no domingo → retorna o dia 2 (segunda).
 */
export function primeiroUtilDoMes(ref: Date = new Date()): Date {
  const dia1 = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const dow = dia1.getDay(); // 0 = domingo, 6 = sábado
  if (dow === 0) return new Date(ref.getFullYear(), ref.getMonth(), 2);
  if (dow === 6) return new Date(ref.getFullYear(), ref.getMonth(), 3);
  return dia1;
}

/**
 * Retorna true se o associado está com mensalidade vencida.
 *
 * Regra:
 * - O vencimento é o primeiro dia útil do mês.
 * - Se hoje < vencimento → está dentro do prazo (não vencido).
 * - Se hoje >= vencimento → verifica se há pagamento no mês corrente.
 *   Considera o mês do vencimento (ex.: se hoje é 2 de junho mas o
 *   vencimento é dia 2, o período em aberto é junho).
 */
export function isVencido(mensalidades: Mensalidade[]): boolean {
  const hoje = new Date();
  const vencimento = primeiroUtilDoMes(hoje);

  if (hoje < vencimento) return false;

  const anoMes = `${vencimento.getFullYear()}-${String(vencimento.getMonth() + 1).padStart(2, "0")}`;

  const pagouMes = mensalidades.some(
    (m) =>
      !m.deleted_at &&
      m.data_pagamento != null &&
      m.data_pagamento.slice(0, 7) === anoMes,
  );

  return !pagouMes;
}

/**
 * Retorna o label formatado do vencimento do mês atual.
 * Ex.: "Vencimento: 2 de junho"
 */
export function labelVencimento(ref: Date = new Date()): string {
  const d = primeiroUtilDoMes(ref);
  return `Vencimento: ${d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`;
}
