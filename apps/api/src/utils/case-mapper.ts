export function toCamelObject(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) =>
      letter.toUpperCase(),
    );
    result[camelKey] = value;
  }
  return result;
}

export function toSnakeObject(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`,
    );
    result[snakeKey] = value;
  }
  return result;
}

export function normalizePayload(payload: Record<string, unknown>) {
  const normalized = { ...payload };
  if (typeof normalized.updatedAt === "string") {
    normalized.updatedAt = new Date(normalized.updatedAt);
  }
  if (typeof normalized.deletedAt === "string") {
    normalized.deletedAt = new Date(normalized.deletedAt);
  }
  return normalized;
}
