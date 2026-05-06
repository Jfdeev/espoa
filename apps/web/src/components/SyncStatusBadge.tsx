import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "@/database/db";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";

/**
 * Indicador compacto de status de sincronização.
 *
 * Estados:
 *  - Offline          → bolinha cinza   + "Offline"
 *  - Online, pendentes → bolinha laranja + "N pendentes"
 *  - Online, em dia    → bolinha verde   + "Sincronizado"
 */
export function SyncStatusBadge({ className }: { className?: string }) {
  const online = useOnlineStatus();
  const [pending, setPending] = useState<number>(0);

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.sync_queue.where("synced").equals(0).count(),
    ).subscribe({
      next: (count) => setPending(count),
      error: () => setPending(0),
    });

    return () => subscription.unsubscribe();
  }, []);

  const { dot, label } = (() => {
    if (!online)      return { dot: "bg-[#9ca3af]",  label: "Offline" };
    if (pending > 0)  return { dot: "bg-[#E67E22]",  label: `${pending} pendente${pending > 1 ? "s" : ""}` };
    return              { dot: "bg-[#22c55e]",  label: "Sincronizado" };
  })();

  return (
    <div
      className={cn("flex items-center gap-1.5 select-none", className)}
      title={online ? `${pending} operações pendentes` : "Sem conexão"}
    >
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot, !online ? "" : "animate-pulse")} />
      <span className="font-label text-xs text-[#1A3C34]/60 leading-none">{label}</span>
    </div>
  );
}
