import { useEffect } from "react";
import { Megaphone } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { filterAvisosAtivos } from "@/repositories/aviso.repository";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";
import type { Aviso } from "@/database/types";

function formatRelative(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `${days} dias atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function AvisosMembroCard() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const assocId = associacaoAtiva?.associacaoId;

  // Live query: reage automaticamente quando o sync traz avisos novos.
  // Funciona offline — mostra o que tem no Dexie.
  const avisos = useLiveQuery<Aviso[]>(
    async () => {
      if (!assocId) return [];
      const rows = await db.aviso
        .where("associacao_id")
        .equals(assocId)
        .filter((a) => !a.deleted_at)
        .toArray();
      const ativos = filterAvisosAtivos(rows);
      return ativos.sort((a, b) =>
        (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
      );
    },
    [] as Aviso[],
    [assocId],
  );

  // Dispara sync 1x para puxar avisos novos do servidor — fire-and-forget
  useEffect(() => {
    if (!assocId) return;
    syncManager.run(getDeviceId()).catch(() => {
      /* offline — Dexie tem o que tem */
    });
  }, [assocId]);

  if (avisos.length === 0) return null;

  return (
    <section className="rounded-xl bg-amber-50 border border-amber-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
          <Megaphone size={16} className="text-amber-700" />
        </div>
        <h2 className="font-headline text-lg font-bold text-amber-900">
          Quadro de Avisos
        </h2>
      </div>
      <ul className="space-y-3">
        {avisos.slice(0, 5).map((a) => (
          <li
            key={a.id}
            className="bg-white rounded-lg p-3 border border-amber-100"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-sm text-amber-950">{a.titulo}</p>
              <span className="text-xs text-amber-700/70 shrink-0">
                {formatRelative(a.updated_at)}
              </span>
            </div>
            <p className="text-sm text-amber-900/80 mt-1 whitespace-pre-wrap">
              {a.mensagem}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
