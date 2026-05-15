// Helpers de formatação em pt-BR compartilhados pelos módulos de IA-02/IA-03.

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

const MESES = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Recebe `YYYY-MM` e devolve `mes de ano`; passa o valor cru se inválido. */
export function formatMonth(monthIso: string): string {
  const [year, month] = monthIso.split("-");
  const idx = Number(month) - 1;
  if (idx < 0 || idx > 11) return monthIso;
  return `${MESES[idx]} de ${year}`;
}

/** Recebe `YYYY-MM-DD` e devolve `DD/MM/YYYY`; passa o valor cru se inválido. */
export function formatDateBR(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/** Dias entre hoje (UTC) e a data alvo `YYYY-MM-DD`. `null` se inválida. */
export function daysUntil(iso: string, now: Date = new Date()): number | null {
  const target = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(target.getTime())) return null;
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.round((target.getTime() - today) / 86_400_000);
}
