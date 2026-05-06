import { useEffect, useState, useCallback, useRef } from "react";
import { Check, X, User, Clock, Users, ShieldCheck, MoreVertical, WifiOff, Send } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useOnlineStatus, isNetworkError } from "@/lib/network";
import { vinculoRepository } from "@/repositories/vinculo.repository";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";

interface VinculoMembro {
  usuarioId: string;
  role: "adm" | "associado";
  status: "pendente" | "ativo" | "inativo" | "rejeitado" | "convidado";
  requestedAt: string;
  joinedAt: string | null;
  nome: string;
  email: string;
  avatarUrl: string | null;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

const VINCULOS_CACHE_PREFIX = "espoa.cache.vinculos.";

function saveVinculosCache(assocId: string, data: VinculoMembro[]) {
  try {
    localStorage.setItem(VINCULOS_CACHE_PREFIX + assocId, JSON.stringify(data));
  } catch { /* ignore storage quota errors */ }
}

function loadVinculosCache(assocId: string): VinculoMembro[] | null {
  try {
    const raw = localStorage.getItem(VINCULOS_CACHE_PREFIX + assocId);
    return raw ? (JSON.parse(raw) as VinculoMembro[]) : null;
  } catch {
    return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberAvatar({ url, nome }: { url: string | null; nome: string }) {
  const initials = nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="w-10 h-10 rounded-full bg-[#1a3c34] flex items-center justify-center flex-shrink-0 overflow-hidden">
      {url ? (
        <img src={url} alt={nome} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[#aacec3] text-sm font-bold">{initials}</span>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "adm" | "associado" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        role === "adm"
          ? "bg-[#1a3c34]/10 text-[#1a3c34]"
          : "bg-[#e5e2dd] text-[#414846]",
      )}
    >
      {role === "adm" ? <ShieldCheck size={11} /> : <User size={11} />}
      {role === "adm" ? "Admin" : "Associado"}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function KebabMenu({
  membro,
  assocId,
  isOpen,
  onToggle,
  onRoleChanged,
  onRemoved,
}: {
  membro: VinculoMembro;
  assocId: string;
  isOpen: boolean;
  onToggle: () => void;
  onRoleChanged: (usuarioId: string, novaRole: "adm" | "associado") => void;
  onRemoved: (usuarioId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const online = useOnlineStatus();

  async function alterarRole(novaRole: "adm" | "associado") {
    setLoading(true);
    try {
      // Intent-based: enqueue offline-safe, then trigger sync if online
      await vinculoRepository.alterarRole(membro.usuarioId, assocId, novaRole);
      // Optimistic UI update
      onRoleChanged(membro.usuarioId, novaRole);
      toast.success(
        novaRole === "adm"
          ? `${membro.nome} promovido a Admin.${!online ? " (aguardando sincronização)" : ""}`
          : `${membro.nome} revertido a Associado.${!online ? " (aguardando sincronização)" : ""}`,
      );
      if (online) {
        syncManager.run(getDeviceId()).catch(() => {/* background — ignore sync errors */});
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Erro ao alterar a role.");
    } finally {
      setLoading(false);
      onToggle();
    }
  }

  async function confirmarRemocao() {
    setLoading(true);
    try {
      await vinculoRepository.remover(membro.usuarioId, assocId);
      onRemoved(membro.usuarioId);
      toast.success(
        `${membro.nome} removido.${!online ? " (aguardando sincronização)" : ""}`,
      );
      if (online) {
        syncManager.run(getDeviceId()).catch(() => {});
      }
    } catch {
      toast.error("Erro ao remover o membro.");
    } finally {
      setLoading(false);
      setShowRemoveModal(false);
      onToggle();
    }
  }

  return (
    <div
      className="relative flex-shrink-0"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={onToggle}
        className="flex items-center justify-center w-8 h-8 rounded-full text-[#414846]/50 hover:text-[#01261f] hover:bg-[#f0ede8] transition-colors"
        aria-label="Mais opções"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] bg-white rounded-xl border border-[#e5e2dd] shadow-[0_8px_24px_rgba(28,28,25,0.1)] overflow-hidden">
          <div className="px-3 py-2 border-b border-[#f0ede8]">
            <p className="text-xs font-semibold text-[#414846]/60 uppercase tracking-wider">
              Alterar role
            </p>
          </div>

          {membro.role !== "adm" && (
            <button
              onClick={() => alterarRole("adm")}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#1c1c19] hover:bg-[#f6f3ee] transition-colors text-left disabled:opacity-40"
            >
              <ShieldCheck size={16} className="text-[#1a3c34] flex-shrink-0" />
              Promover a Admin
            </button>
          )}

          {membro.role !== "associado" && (
            <button
              onClick={() => alterarRole("associado")}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#1c1c19] hover:bg-[#f6f3ee] transition-colors text-left disabled:opacity-40"
            >
              <User size={16} className="text-[#414846] flex-shrink-0" />
              Rebaixar a Associado
            </button>
          )}

          <div className="border-t border-[#f0ede8]" />
          <button
            onClick={() => setShowRemoveModal(true)}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors text-left disabled:opacity-40"
          >
            <X size={16} className="text-[#ba1a1a] flex-shrink-0" />
            Remover da Associação
          </button>
        </div>
      )}

      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remover membro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{membro.nome}</strong> da associação? Essa ação pode ser revertida por um administrador.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <button className="px-4 py-2 text-sm font-medium text-[#414846] bg-[#f0ede8] hover:bg-[#e5e2dd] rounded-lg transition-colors" />
              }
            >
              Cancelar
            </DialogClose>
            <button
              onClick={confirmarRemocao}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#ba1a1a] hover:bg-[#93000a] rounded-lg transition-colors disabled:opacity-40"
            >
              {loading ? "Removendo..." : "Remover"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssociadosPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const currentUserId = useAuthStore((s) => s.perfil?.id);
  const [vinculos, setVinculos] = useState<VinculoMembro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useOnlineStatus();

  const assocId = associacaoAtiva?.associacaoId;

  // ── Conflict log watcher — surfaces sync conflicts as toasts ────────────────
  const unresolvedConflicts = useLiveQuery(
    () => db.conflict_log.where("resolved").equals(0).toArray(),
    [],
  );
  const shownConflictIds = useRef<Set<number>>(new Set());
  // Only toast conflicts that arrived in the current browsing session to avoid
  // replaying old entries on every page reload if marking resolved somehow failed.
  const sessionStartMs = useRef<number>(Date.now());

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!openMenuId) return;
    function close() { setOpenMenuId(null); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenuId]);

  const carregar = useCallback(async () => {
    if (!assocId) return;
    try {
      const { data } = await api.get<VinculoMembro[]>(`/associacoes/${assocId}/vinculos`);
      setVinculos(data);
      saveVinculosCache(assocId, data);
      setFromCache(false);
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = loadVinculosCache(assocId);
        if (cached) {
          setVinculos(cached);
          setFromCache(true);
        } else {
          toast.error("Sem conexão e sem dados em cache.");
        }
      } else {
        toast.error("Não foi possível carregar os membros.");
      }
    } finally {
      setCarregando(false);
    }
  }, [assocId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Recarregar silenciosamente ao reconectar
  useEffect(() => {
    if (online && fromCache) {
      carregar();
    }
  }, [online, fromCache, carregar]);

  // ── Conflict log watcher — surfaces sync conflicts as toasts ────────────────
  useEffect(() => {
    if (!unresolvedConflicts || unresolvedConflicts.length === 0) return;
    let needsListRefresh = false;
    for (const conflict of unresolvedConflicts) {
      if (conflict.id == null || shownConflictIds.current.has(conflict.id)) continue;
      shownConflictIds.current.add(conflict.id);
      // Only toast if the conflict was written during this session
      const conflictMs = conflict.created_at
        ? new Date(conflict.created_at).getTime()
        : 0;
      if (conflictMs >= sessionStartMs.current) {
        toast.error(conflict.reason ?? "Conflito de sincronização detectado.", {
          description: "A ação foi ignorada pelo servidor. Recarregue a página para ver o estado atual.",
          duration: 10000,
        });
      }
      // Mark resolved so it won't fire again; always do this even for old entries
      db.conflict_log.update(conflict.id, { resolved: 1 }).catch(() => {});
      // If the conflict is about member links, trigger a list refresh so the UI
      // shows the server's canonical state instead of the optimistic update
      if (conflict.table_name === "usuario_associacao") {
        needsListRefresh = true;
      }
    }
    if (needsListRefresh) {
      carregar();
    }
  }, [unresolvedConflicts, carregar]);

  /**
   * Approve or reject a pending member.
   * Now uses the intent-based vinculoRepository — works offline (queues intent).
   */
  async function gerenciar(usuarioId: string, acao: "aprovar" | "rejeitar") {
    if (!assocId) return;
    setAcaoEmAndamento(usuarioId);
    try {
      if (acao === "aprovar") {
        await vinculoRepository.aprovar(usuarioId, assocId);
      } else {
        await vinculoRepository.rejeitar(usuarioId, assocId);
      }

      // Optimistic update
      setVinculos((prev) => {
        const next = prev.map((v) =>
          v.usuarioId === usuarioId
            ? {
                ...v,
                status: (acao === "aprovar" ? "ativo" : "rejeitado") as VinculoMembro["status"],
                joinedAt: acao === "aprovar" ? new Date().toISOString() : null,
              }
            : v,
        );
        saveVinculosCache(assocId, next);
        return next;
      });

      toast.success(
        acao === "aprovar"
          ? `Membro aprovado.${!online ? " (aguardando sincronização)" : ""}`
          : `Solicitação rejeitada.${!online ? " (aguardando sincronização)" : ""}`,
      );

      // Trigger immediate sync if online
      if (online) {
        syncManager.run(getDeviceId()).catch(() => {/* background */});
      }
    } catch {
      toast.error("Erro ao processar a ação. Tente novamente.");
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  function handleRoleChanged(usuarioId: string, novaRole: "adm" | "associado") {
    setVinculos((prev) => {
      const next = prev.map((v) => (v.usuarioId === usuarioId ? { ...v, role: novaRole } : v));
      if (assocId) saveVinculosCache(assocId, next);
      return next;
    });
  }

  function handleRemoved(usuarioId: string) {
    setVinculos((prev) => {
      const next = prev.map((v) =>
        v.usuarioId === usuarioId ? { ...v, status: "inativo" as VinculoMembro["status"] } : v,
      );
      if (assocId) saveVinculosCache(assocId, next);
      return next;
    });
  }

  const pendentes = vinculos.filter((v) => v.status === "pendente");
  const convidados = vinculos.filter((v) => v.status === "convidado");
  const ativos = vinculos.filter((v) => v.status === "ativo");
  const outros = vinculos.filter((v) => v.status === "rejeitado" || v.status === "inativo");

  const [emailConvite, setEmailConvite] = useState("");
  const [enviandoConvite, setEnviandoConvite] = useState(false);

  async function convidarPorEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!assocId || !emailConvite.trim()) return;
    setEnviandoConvite(true);
    try {
      await api.post(`/associacoes/${assocId}/convidar`, { email: emailConvite.trim().toLowerCase() });
      toast.success(`Convite enviado para ${emailConvite}`);
      setEmailConvite("");
      carregar();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (msg === "Nenhum usuário encontrado com este e-mail") {
        toast.error("Nenhum usuário cadastrado com este e-mail.");
      } else if (msg?.includes("já é membro")) {
        toast.error("Este usuário já é membro ativo.");
      } else if (msg?.includes("já foi convidado")) {
        toast.error("Este usuário já foi convidado.");
      } else {
        toast.error(msg ?? "Erro ao enviar convite.");
      }
    } finally {
      setEnviandoConvite(false);
    }
  }

  return (
    <AppLayout navItems={adminNavItems} title="Portal do Admin">
      <Toaster />
      <div className="p-6 lg:p-12 max-w-4xl mx-auto space-y-10">
        {/* Hero */}
        <div>
          <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f] mb-1">
            Associados
          </h1>
          <p className="text-[#414846]">
            Gerencie os membros e solicitações de{" "}
            <span className="font-medium text-[#01261f]">
              {associacaoAtiva?.associacaoNome}
            </span>
            .
          </p>
        </div>

        {/* Offline / cache banner */}
        {(!online || fromCache) && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fff3e0] border border-[#E67E22]/30 text-sm text-[#9a4f00]">
            <WifiOff size={16} className="shrink-0" />
            <span>
              {fromCache
                ? "Dados em cache. Aprovações e alterações de role ficam na fila e serão enviadas quando você reconectar."
                : "Sem conexão. Aprovações e alterações de role ficam na fila e serão enviadas quando você reconectar."}
            </span>
          </div>
        )}

        {carregando ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-[#1a3c34] border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Convidar membro */}
            {online && (
              <section>
                <h2 className="font-headline text-xl font-bold text-[#01261f] mb-3">
                  Convidar Membro
                </h2>
                <form onSubmit={convidarPorEmail} className="flex gap-3">
                  <input
                    type="email"
                    value={emailConvite}
                    onChange={(e) => setEmailConvite(e.target.value)}
                    placeholder="Digite o e-mail do usuário..."
                    required
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#c1c8c4]/50 bg-white text-sm text-[#1c1c19] placeholder:text-[#414846]/40 focus:outline-none focus:ring-2 focus:ring-[#1a3c34]/20 focus:border-[#1a3c34] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={enviandoConvite || !emailConvite.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#01261f] text-white text-sm font-medium hover:bg-[#1a3c34] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send size={15} />
                    {enviandoConvite ? "Enviando..." : "Convidar"}
                  </button>
                </form>
              </section>
            )}
            {/* Solicitações Pendentes */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-headline text-xl font-bold text-[#01261f]">
                  Solicitações Pendentes
                </h2>
                {pendentes.length > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#E67E22] text-white text-xs font-bold">
                    {pendentes.length}
                  </span>
                )}
              </div>

              {pendentes.length === 0 ? (
                <div className="rounded-xl border border-[#c1c8c4]/30 bg-white p-10 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#f6f3ee] flex items-center justify-center">
                    <Clock size={22} className="text-[#414846]/60" />
                  </div>
                  <p className="font-medium text-[#1c1c19]">Nenhuma solicitação pendente</p>
                  <p className="text-sm text-[#414846]/60">
                    Quando alguém solicitar entrada, aparecerá aqui.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#E67E22]/30 bg-[#fff9f5] divide-y divide-[#E67E22]/10">
                  {pendentes.map((m) => (
                    <div key={m.usuarioId} className="flex items-center gap-4 p-4 first:rounded-t-xl last:rounded-b-xl">
                      <MemberAvatar url={m.avatarUrl} nome={m.nome} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-[#1c1c19] truncate">{m.nome}</p>
                          <RoleBadge role={m.role} />
                        </div>
                        <p className="text-xs text-[#414846]/60 mt-0.5 truncate">{m.email}</p>
                        <p className="text-xs text-[#414846]/50 mt-0.5">
                          Solicitado em {formatDate(m.requestedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => gerenciar(m.usuarioId, "rejeitar")}
                          disabled={acaoEmAndamento === m.usuarioId}
                          className="flex items-center justify-center w-9 h-9 rounded-full border border-[#ba1a1a]/30 text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Rejeitar"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={() => gerenciar(m.usuarioId, "aprovar")}
                          disabled={acaoEmAndamento === m.usuarioId}
                          className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-[#01261f] text-white text-sm font-medium hover:bg-[#1a3c34] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Aprovar"
                        >
                          <Check size={15} />
                          Aprovar
                        </button>
                        {assocId && (
                          <KebabMenu
                            membro={m}
                            assocId={assocId}
                            isOpen={openMenuId === m.usuarioId}
                            onToggle={() =>
                              setOpenMenuId(openMenuId === m.usuarioId ? null : m.usuarioId)
                            }
                            onRoleChanged={handleRoleChanged}
                            onRemoved={handleRemoved}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Convites Enviados */}
            {convidados.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-headline text-xl font-bold text-[#01261f]">
                    Convites Enviados
                  </h2>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1a3c34]/10 text-[#1a3c34] text-xs font-bold">
                    {convidados.length}
                  </span>
                </div>
                <div className="rounded-xl border border-[#c1c8c4]/30 bg-white divide-y divide-[#f0ede8]">
                  {convidados.map((m) => (
                    <div
                      key={m.usuarioId}
                      className="flex items-center gap-4 p-4 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <MemberAvatar url={m.avatarUrl} nome={m.nome} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1c1c19] truncate">{m.nome}</p>
                        <p className="text-xs text-[#414846]/60 mt-0.5 truncate">{m.email}</p>
                      </div>
                      <span className="text-xs text-[#414846]/50 italic">Aguardando resposta</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Membros Ativos */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-headline text-xl font-bold text-[#01261f]">
                  Membros Ativos
                </h2>
                <span className="text-sm text-[#414846]/60">{ativos.length}</span>
              </div>

              {ativos.length === 0 ? (
                <div className="rounded-xl border border-[#c1c8c4]/30 bg-white p-10 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#f6f3ee] flex items-center justify-center">
                    <Users size={22} className="text-[#414846]/60" />
                  </div>
                  <p className="font-medium text-[#1c1c19]">Nenhum membro ativo ainda</p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#c1c8c4]/30 bg-white divide-y divide-[#f0ede8]">
                  {ativos.map((m) => (
                    <div
                      key={m.usuarioId}
                      className="flex items-center gap-4 p-4 hover:bg-[#fcf9f4] transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <MemberAvatar url={m.avatarUrl} nome={m.nome} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-[#1c1c19] truncate">{m.nome}</p>
                          <RoleBadge role={m.role} />
                        </div>
                        <p className="text-xs text-[#414846]/60 mt-0.5 truncate">{m.email}</p>
                      </div>
                      {m.joinedAt && (
                        <p className="text-xs text-[#414846]/50 flex-shrink-0 mr-1">
                          Desde {formatDate(m.joinedAt)}
                        </p>
                      )}
                      {/* Não mostra o menu para o próprio admin logado */}
                      {m.usuarioId !== currentUserId && assocId && (
                        <KebabMenu
                          membro={m}
                          assocId={assocId}
                          isOpen={openMenuId === m.usuarioId}
                          onToggle={() =>
                            setOpenMenuId(openMenuId === m.usuarioId ? null : m.usuarioId)
                          }
                          onRoleChanged={handleRoleChanged}
                          onRemoved={handleRemoved}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Outros (rejeitados/inativos) */}
            {outros.length > 0 && (
              <section>
                <h2 className="font-headline text-xl font-bold text-[#01261f] mb-4">Outros</h2>
                <div className="rounded-xl border border-[#c1c8c4]/30 bg-white divide-y divide-[#f0ede8]">
                  {outros.map((m) => (
                    <div key={m.usuarioId} className="flex items-center gap-4 p-4 opacity-60 first:rounded-t-xl last:rounded-b-xl">
                      <MemberAvatar url={m.avatarUrl} nome={m.nome} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-[#1c1c19] truncate">{m.nome}</p>
                          <RoleBadge role={m.role} />
                        </div>
                        <p className="text-xs text-[#414846]/60 mt-0.5 truncate">{m.email}</p>
                      </div>
                      <span className="text-xs text-[#414846]/50 flex-shrink-0 capitalize">
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
