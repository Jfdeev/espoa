import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Resolve para onde redirecionar o usuário após login, baseado nos vínculos */
export function resolverDestino(vinculos: { status: string }[]): string {
  if (vinculos.some((v) => v.status === "ativo")) return "/app";
  if (vinculos.length > 0) return "/solicitacoes";
  return "/onboarding";
}
