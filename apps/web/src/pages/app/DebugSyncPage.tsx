import { useState } from "react";
import { Navigate } from "react-router-dom";
import { RefreshCw, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";
import { useOnlineStatus } from "@/lib/network";
import { useAuthStore } from "@/store/auth.store";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";

/**
 * Dev / admin debug page for the offline-first sync system.
 *
 * Shows the pending outbox queue and conflict log.
 * Provides a manual "force sync" trigger and a conflict log cleaner.
 *
 * Route: /debug/sync
 * Only intended for development / power-admin use — no link in production nav.
 */
export default function DebugSyncPage() {
  // All hooks must run unconditionally before any early return (Rules of Hooks).
  const role = useAuthStore((s) => s.associacaoAtiva?.role);
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);

  const pendingOps = useLiveQuery(
    () => db.sync_queue.where("synced").equals(0).reverse().sortBy("created_at"),
    [],
  );

  const syncedOps = useLiveQuery(
    () => db.sync_queue.where("synced").equals(1).count(),
    [],
    0,
  );

  const conflicts = useLiveQuery(
    () => db.conflict_log.orderBy("created_at").reverse().toArray(),
    [],
  );

  const lastCursor = localStorage.getItem("espoa.sync.lastPullCursor");
  const deviceId = getDeviceId();

  // Only admins may access this page — redirect all others silently.
  if (role !== "adm") return <Navigate to="/app" replace />;

  async function forceSync() {
    if (!online) {
      toast.error("Sem conexão — sync impossível.");
      return;
    }
    setSyncing(true);
    try {
      const result = await syncManager.run(deviceId);
      if (result.status === "already_running") {
        toast.info("Sync já em andamento em outra aba.");
      } else {
        toast.success(
          `Sync concluído — enviados: ${result.pushed}, recebidos: ${result.pulled}${result.pruned > 0 ? `, purgados: ${result.pruned}` : ""}`,
        );
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Erro desconhecido";
      toast.error(`Sync falhou: ${msg}`);
    } finally {
      setSyncing(false);
    }
  }

  async function clearResolvedConflicts() {
    const keys = await db.conflict_log
      .where("resolved")
      .equals(1)
      .primaryKeys();
    await db.conflict_log.bulkDelete(keys as number[]);
    toast.success(`${keys.length} conflito(s) resolvido(s) removidos.`);
  }

  return (
    <AppLayout navItems={adminNavItems} title="Debug — Sync">
      <Toaster />
      <div className="p-6 lg:p-12 max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <h1 className="font-headline text-3xl font-bold text-[#01261f] mb-1">
            Debug: Sincronização
          </h1>
          <p className="text-[#414846] text-sm">
            Diagnóstico do sistema offline-first. Não exposto no menu de produção.
          </p>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Device ID" value={deviceId.slice(0, 8) + "…"} />
          <Stat label="Pendentes" value={String(pendingOps?.length ?? 0)} highlight={!!pendingOps?.length} />
          <Stat label="Sincronizados" value={String(syncedOps ?? 0)} />
          <Stat label="Conflitos" value={String(conflicts?.length ?? 0)} highlight={!!conflicts?.length} />
        </div>

        {/* Pull cursor */}
        <div className="rounded-xl border border-[#e5e2dd] p-4 bg-white text-sm">
          <p className="text-[#414846]/60 text-xs font-semibold uppercase tracking-wide mb-1">
            Último cursor de pull
          </p>
          <code className="text-[#01261f] break-all">{lastCursor ?? "(nunca sincronizado)"}</code>
        </div>

        {/* Force sync */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={forceSync}
            disabled={syncing || !online}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a3c34] text-white text-sm font-medium hover:bg-[#01261f] disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando…" : "Forçar sync agora"}
          </button>

          {(conflicts?.some(c => c.resolved === 1)) && (
            <button
              onClick={clearResolvedConflicts}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#e5e2dd] text-sm text-[#414846] hover:bg-[#f6f3ee] transition-colors"
            >
              <Trash2 size={16} />
              Limpar conflitos resolvidos
            </button>
          )}
        </div>

        {/* Pending queue */}
        <section>
          <h2 className="font-headline text-lg font-bold text-[#01261f] mb-3">
            Fila pendente ({pendingOps?.length ?? 0})
          </h2>
          {!pendingOps?.length ? (
            <EmptyState icon={<CheckCircle2 size={20} className="text-green-500" />} text="Nenhuma operação pendente." />
          ) : (
            <div className="rounded-xl border border-[#e5e2dd] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f6f3ee] text-left text-xs text-[#414846]/60 font-semibold uppercase tracking-wide">
                    <th className="px-4 py-2">Tabela</th>
                    <th className="px-4 py-2">Operação</th>
                    <th className="px-4 py-2">Record ID</th>
                    <th className="px-4 py-2">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOps.map((op) => (
                    <tr key={op.id} className="border-t border-[#f0ede8]">
                      <td className="px-4 py-2 font-mono text-[#01261f]">{op.table_name}</td>
                      <td className="px-4 py-2">
                        <OpBadge op={op.operation} />
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-[#414846]/70 truncate max-w-[140px]">
                        {op.record_id}
                      </td>
                      <td className="px-4 py-2 text-xs text-[#414846]/60">
                        {new Date(op.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Conflict log */}
        <section>
          <h2 className="font-headline text-lg font-bold text-[#01261f] mb-3">
            Log de conflitos ({conflicts?.length ?? 0})
          </h2>
          {!conflicts?.length ? (
            <EmptyState icon={<CheckCircle2 size={20} className="text-green-500" />} text="Nenhum conflito registrado." />
          ) : (
            <div className="space-y-3">
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-xl border p-4 text-sm ${c.resolved ? "border-[#e5e2dd] bg-white opacity-60" : "border-orange-200 bg-orange-50"}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className={c.resolved ? "text-[#414846]/40" : "text-orange-500"} />
                      <span className="font-mono text-xs text-[#01261f]">{c.table_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c.resolved ? "bg-[#e5e2dd] text-[#414846]/60" : "bg-orange-100 text-orange-700"}`}>
                        {c.resolved ? "resolvido" : "pendente"}
                      </span>
                    </div>
                    <span className="text-xs text-[#414846]/50 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-[#414846] mt-1">{c.reason ?? "Sem descrição"}</p>
                  <p className="font-mono text-xs text-[#414846]/50 mt-1 truncate">
                    record: {c.record_id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </AppLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-[#e5e2dd] bg-white p-4">
      <p className="text-xs text-[#414846]/60 font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold font-headline ${highlight ? "text-[#E67E22]" : "text-[#01261f]"}`}>
        {value}
      </p>
    </div>
  );
}

function OpBadge({ op }: { op: string }) {
  const colors: Record<string, string> = {
    create: "bg-green-100 text-green-700",
    update: "bg-blue-100 text-blue-700",
    delete: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[op] ?? "bg-[#e5e2dd] text-[#414846]"}`}>
      {op}
    </span>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-6 rounded-xl border border-[#e5e2dd] text-[#414846]/60 text-sm">
      {icon}
      <span>{text}</span>
    </div>
  );
}
