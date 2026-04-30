import { useEffect, useState, useCallback } from "react";
import { Check, X, User, Clock, Users, ShieldCheck, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";

interface VinculoMembro {
  usuarioId: string;
  role: "adm" | "associado";
  status: "pendente" | "ativo" | "inativo" | "rejeitado";
  requestedAt: string;
  joinedAt: string | null;
  nome: string;
  email: string;
  avatarUrl: string | null;
}

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
}: {
  membro: VinculoMembro;
  assocId: string;
  isOpen: boolean;
  onToggle: () => void;
  onRoleChanged: (usuarioId: string, novaRole: "adm" | "associado") => void;
}) {
  const [loading, setLoading] = useState(false);

  async function alterarRole(novaRole: "adm" | "associado") {
    setLoading(true);
    try {
      await api.patch(`/associacoes/${assocId}/vinculos/${membro.usuarioId}/role`, {
        role: novaRole,
      });
      onRoleChanged(membro.usuarioId, novaRole);
      toast.success(
        novaRole === "adm"
          ? `${membro.nome} agora é Admin.`
          : `${membro.nome} agora é Associado.`,
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Erro ao alterar a role.");
    } finally {
      setLoading(false);
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
        </div>
      )}
    </div>
  );
}

export default function AssociadosPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const currentUserId = useAuthStore((s) => s.perfil?.id);
  const [vinculos, setVinculos] = useState<VinculoMembro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const assocId = associacaoAtiva?.associacaoId;

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
    } catch {
      toast.error("Não foi possível carregar os membros.");
    } finally {
      setCarregando(false);
    }
  }, [assocId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function gerenciar(usuarioId: string, acao: "aprovar" | "rejeitar") {
    if (!assocId) return;
    setAcaoEmAndamento(usuarioId);
    try {
      await api.patch(`/associacoes/${assocId}/vinculos/${usuarioId}`, { acao });
      setVinculos((prev) =>
        prev.map((v) =>
          v.usuarioId === usuarioId
            ? {
                ...v,
                status: acao === "aprovar" ? "ativo" : "rejeitado",
                joinedAt: acao === "aprovar" ? new Date().toISOString() : null,
              }
            : v,
        ),
      );
      toast.success(acao === "aprovar" ? "Membro aprovado com sucesso." : "Solicitação rejeitada.");
    } catch {
      toast.error("Erro ao processar a ação. Tente novamente.");
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  function handleRoleChanged(usuarioId: string, novaRole: "adm" | "associado") {
    setVinculos((prev) =>
      prev.map((v) => (v.usuarioId === usuarioId ? { ...v, role: novaRole } : v)),
    );
  }

  const pendentes = vinculos.filter((v) => v.status === "pendente");
  const ativos = vinculos.filter((v) => v.status === "ativo");
  const outros = vinculos.filter((v) => v.status === "rejeitado" || v.status === "inativo");

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

        {carregando ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-[#1a3c34] border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="space-y-10">
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
                          className="flex items-center justify-center w-9 h-9 rounded-full border border-[#ba1a1a]/30 text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors disabled:opacity-40"
                          aria-label="Rejeitar"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={() => gerenciar(m.usuarioId, "aprovar")}
                          disabled={acaoEmAndamento === m.usuarioId}
                          className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-[#01261f] text-white text-sm font-medium hover:bg-[#1a3c34] transition-colors disabled:opacity-40"
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
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

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
                      {assocId && m.usuarioId !== currentUserId && (
                        <KebabMenu
                          membro={m}
                          assocId={assocId}
                          isOpen={openMenuId === m.usuarioId}
                          onToggle={() =>
                            setOpenMenuId(openMenuId === m.usuarioId ? null : m.usuarioId)
                          }
                          onRoleChanged={handleRoleChanged}
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
