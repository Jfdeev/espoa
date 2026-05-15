import { useEffect, useState, useCallback } from "react";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import {
  BanknoteArrowUp,
  CheckCircle,
  AlertCircle,
  Clock,
  QrCode,
  Users,
  Copy,
  Check,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth.store";
import { db } from "@/database/db";
import type { Mensalidade } from "@/database/types";
import AppLayout from "./AppLayout";
import { adminNavItems, memberNavItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { isVencido, labelVencimento } from "@/lib/mensalidade-utils";
import { getDeviceId } from "@/lib/device-id";
import api from "@/lib/api";
import { useOnlineStatus } from "@/lib/network";
import { mensalidadeRepository } from "@/repositories/financeiro.repository";
import { syncManager } from "@/sync/manager";

// ─── Constantes ──────────────────────────────────────────────────────────────

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
];

const VALOR_MENSALIDADE_DEFAULT = 15; // R$ 15,00

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function FormaPagamentoBadge({ forma }: Readonly<{ forma: string | undefined }>) {
  if (!forma) return null;
  const label = FORMAS_PAGAMENTO.find((f) => f.value === forma)?.label ?? forma;
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-[#1a3c34]/10 text-[#1a3c34]">
      {label}
    </span>
  );
}

// ─── View do Associado ────────────────────────────────────────────────────────

interface PixBillingData {
  id: string;
  url: string;
  amount: number;
  status: string;
  pixCode?: string;
  pixQrCode?: string;
}

const BILLING_STORAGE_KEY = "espoa_pending_billing";

function saveBilling(b: PixBillingData | null) {
  if (b) localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(b));
  else localStorage.removeItem(BILLING_STORAGE_KEY);
}

function loadBilling(): PixBillingData | null {
  try {
    const raw = localStorage.getItem(BILLING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PixBillingData) : null;
  } catch {
    return null;
  }
}

function useMensalidadesDoUsuario(usuarioId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!usuarioId) return [] as Mensalidade[];

      // Busca o associado vinculado ao usuário (para compatibilidade com pagamentos antigos do admin)
      const assoc = await db.associado
        .where("usuario_id")
        .equals(usuarioId)
        .filter((a) => !a.deleted_at)
        .first();

      return db.mensalidade
        .filter(
          (m) =>
            !m.deleted_at &&
            (m.usuario_id === usuarioId || (!!assoc?.id && m.associado_id === assoc.id)),
        )
        .toArray();
    },
    undefined as Mensalidade[] | undefined,
    [usuarioId],
  );
}

function AssociadoView() {
  const perfil = useAuthStore((s) => s.perfil);
  const [gerando, setGerando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [billing, setBillingState] = useState<PixBillingData | null>(loadBilling);
  const [copiado, setCopiado] = useState(false);

  function setBilling(b: PixBillingData | null) {
    saveBilling(b);
    setBillingState(b);
  }

  // Reactivo: atualiza automaticamente quando o sync popula o Dexie
  const mensalidades = useMensalidadesDoUsuario(perfil?.id);

  const loading = mensalidades === undefined;

  // Dispara sync com o servidor — o useLiveQuery reage automaticamente quando chegar dado
  const sincronizar = useCallback(async () => {
    try {
      const { syncManager } = await import("@/sync");
      const deviceId = (await import("@/lib/device-id")).getDeviceId();
      await syncManager.run(deviceId);
    } catch {
      // falhou (offline) — IndexedDB já tem os dados certos
    }
  }, []);

  useEffect(() => {
    sincronizar();
  }, [sincronizar]);

  async function handleGerarPix() {
    setGerando(true);
    try {
      const { data } = await api.post<PixBillingData>("/pix/gerar", {
        valor: VALOR_MENSALIDADE_DEFAULT,
      });
      setBilling(data);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (code === "ja_pago_no_mes") {
        toast.success("Você já pagou a mensalidade deste mês!");
        await sincronizar();
      } else {
        toast.error("Não foi possível gerar o PIX. Tente novamente.");
      }
    } finally {
      setGerando(false);
    }
  }

  function copiarCodigo() {
    if (!billing?.pixCode) return;
    navigator.clipboard.writeText(billing.pixCode).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    });
  }

  async function handleVerificar() {
    if (!billing?.id) return;
    setVerificando(true);
    try {
      const { data } = await api.post<{ pago: boolean; status: string; aviso?: string }>(
        "/pix/verificar",
        { billingId: billing.id },
      );
      if (data.pago) {
        toast.success("Pagamento confirmado! Atualizando...");
        setBilling(null);
        await sincronizar();
      } else {
        toast.error(`Pagamento ainda não confirmado (status: ${data.status ?? "pendente"}).`);
      }
    } catch {
      toast.error("Não foi possível verificar o pagamento.");
    } finally {
      setVerificando(false);
    }
  }

  const vencido = isVencido(mensalidades ?? []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-[#f6f3ee] animate-pulse" />
        ))}
      </div>
    );
  }

  const historico = [...(mensalidades ?? [])].sort((a, b) =>
    (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f] mb-1">
          Mensalidades
        </h1>
        <p className="text-[#414846]">Acompanhe e pague sua mensalidade.</p>
      </div>

      {/* Status do mês */}
      <div
        className={cn(
          "rounded-2xl p-6 flex items-center gap-4",
          vencido
            ? "bg-red-50 border border-red-200"
            : "bg-emerald-50 border border-emerald-200",
        )}
      >
        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
            vencido ? "bg-red-100" : "bg-emerald-100",
          )}
        >
          {vencido ? (
            <AlertCircle size={24} className="text-red-600" />
          ) : (
            <CheckCircle size={24} className="text-emerald-600" />
          )}
        </div>
        <div className="flex-1">
          <p
            className={cn(
              "font-bold text-base",
              vencido ? "text-red-700" : "text-emerald-700",
            )}
          >
            {vencido ? "Mensalidade vencida" : "Em dia"}
          </p>
          <p className={cn("text-sm", vencido ? "text-red-600/80" : "text-emerald-600/80")}>
            {labelVencimento()}
          </p>
        </div>
        {vencido && !billing && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              onClick={handleGerarPix}
              disabled={gerando}
              className="bg-[#01261f] hover:bg-[#1a3c34] text-white h-10 px-5 rounded-xl font-medium flex items-center gap-2"
            >
              <QrCode size={18} />
              {gerando ? "Gerando..." : "Pagar via PIX"}
            </Button>
          </div>
        )}
        {vencido && billing && (
          <Button
            onClick={handleVerificar}
            disabled={verificando}
            variant="outline"
            className="h-10 px-4 rounded-xl font-medium flex-shrink-0 text-sm"
          >
            {verificando ? "Verificando..." : "Verificar pagamento"}
          </Button>
        )}
      </div>

      {/* QR Code / PIX Code */}
      {billing && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 border border-[#e5e2dd]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#01261f] flex items-center justify-center">
              <QrCode size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-[#01261f]">
                Pague via PIX
              </h3>
              <p className="text-sm text-[#414846]">
                {formatCurrency(billing.amount / 100)} · Copie o código ou abra o link
              </p>
            </div>
          </div>

          {billing.pixCode && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#414846]">
                Código PIX (Copia e Cola)
              </Label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={billing.pixCode}
                  className="flex-1 text-xs font-mono bg-[#f6f3ee] border-none rounded-lg px-3 py-2 text-[#01261f] truncate"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={copiarCodigo}
                  className="flex-shrink-0 h-9 px-3 gap-1.5"
                >
                  {copiado ? (
                    <><Check size={15} className="text-emerald-600" />Copiado</>
                  ) : (
                    <><Copy size={15} />Copiar</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {billing.url && (
            <a
              href={billing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 text-center rounded-xl bg-[#01261f] text-white font-bold text-sm hover:bg-[#1a3c34] transition-colors"
            >
              Abrir página de pagamento
            </a>
          )}

          <p className="text-xs text-[#414846]/60 text-center">
            Após o pagamento, aguarde alguns instantes para a confirmação automática.
          </p>

          <Button
            type="button"
            onClick={handleVerificar}
            disabled={verificando}
            variant="outline"
            className="w-full h-10 rounded-xl font-medium"
          >
            {verificando ? "Verificando..." : "Já paguei — Verificar pagamento"}
          </Button>
        </div>
      )}

      {/* Histórico */}
      <div className="space-y-4">
        <h2 className="font-headline text-xl font-bold text-[#01261f]">
          Histórico de Pagamentos
        </h2>
        {historico.length === 0 ? (
          <div className="bg-[#f6f3ee] rounded-xl p-8 text-center text-[#414846]">
            Nenhum pagamento registrado.
          </div>
        ) : (
          <div className="space-y-3">
            {historico.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#414846]">
                    {m.data_pagamento ? formatDate(m.data_pagamento) : "Sem data"}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <FormaPagamentoBadge forma={m.forma_pagamento ?? undefined} />
                  <span className="font-bold text-[#01261f]">
                    {formatCurrency(m.valor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── View do Admin ────────────────────────────────────────────────────────────

interface Membro {
  usuarioId: string;
  nome: string;
  role: string;
  status: string;
}

interface PagamentoForm {
  usuario_id: string;
  valor: string;
  data_pagamento: string;
  forma_pagamento: string;
}

const formVazio: PagamentoForm = {
  usuario_id: "",
  valor: "15",
  data_pagamento: new Date().toISOString().slice(0, 10),
  forma_pagamento: "pix",
};

type FiltroStatus = "todos" | "vencidos" | "em_dia";

function AdminView() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const online = useOnlineStatus();
  const assocId = associacaoAtiva?.associacaoId;

  const [form, setForm] = useState<PagamentoForm>(formVazio);
  const [submitting, setSubmitting] = useState(false);
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");

  // Vínculos vindos da API (fonte primária quando online — evita depender do sync incremental)
  const [vinculosApi, setVinculosApi] = useState<Array<{ usuarioId: string; nome: string; role: string; status: string }>>([]);

  // Busca vínculos da API sempre que ficar online
  useEffect(() => {
    if (!online || !assocId) return;
    api
      .get<Array<{ usuarioId: string; nome: string; status: string; role: string }>>(`/associacoes/${assocId}/vinculos`)
      .then((res) => setVinculosApi(res.data))
      .catch(() => {}); // offline — usa fallback do Dexie
  }, [online, assocId]);

  // Lista de membros ativos do Dexie — usada como fallback quando offline
  const membrosLocal = useLiveQuery<Membro[]>(
    async () => {
      if (!assocId) return [];
      const vinculos = await db.usuario_associacao
        .where("associacao_id")
        .equals(assocId)
        .filter((v) => v.status === "ativo" && v.role !== "adm")
        .toArray();
      const usuarioIds = vinculos.map((v) => v.usuario_id);
      const associados = await db.associado
        .filter((a) => !a.deleted_at && !!a.usuario_id && usuarioIds.includes(a.usuario_id!))
        .toArray();
      const nomeFallbackMap = new Map(associados.map((a) => [a.usuario_id!, a.nome]));
      return vinculos.map((v) => ({
        usuarioId: v.usuario_id,
        nome: nomeFallbackMap.get(v.usuario_id) ?? v.usuario_id.slice(0, 8),
        role: v.role,
        status: v.status,
      }));
    },
    [],
    [assocId],
  );

  // Fonte de verdade para membros: API quando disponível, Dexie como fallback
  const membros: Membro[] = vinculosApi.length > 0
    ? vinculosApi
        .filter((v) => v.status === "ativo" && v.role !== "adm")
        .map((v) => ({ usuarioId: v.usuarioId, nome: v.nome, role: v.role, status: v.status }))
    : (membrosLocal ?? []);

  // Nome resolvido: API > Dexie > id curto
  const getNome = (usuarioId: string): string =>
    membros.find((m) => m.usuarioId === usuarioId)?.nome ??
    usuarioId.slice(0, 8);

  const mensalidades = useLiveQuery<Mensalidade[]>(
    async () => {
      if (!assocId) return [];
      const vinculos = await db.usuario_associacao
        .where("associacao_id")
        .equals(assocId)
        .filter((v) => v.status === "ativo")
        .toArray();
      const userIdSet = new Set(vinculos.map((v) => v.usuario_id));
      return db.mensalidade
        .filter((m) => !m.deleted_at && !!m.usuario_id && userIdSet.has(m.usuario_id!))
        .toArray();
    },
    [],
    [assocId],
  );

  // Dispara sync ao montar/reconectar para puxar dados frescos do servidor
  useEffect(() => {
    if (online) {
      syncManager.run(getDeviceId()).catch(() => {});
    }
  }, [online]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const usuarioId = form.usuario_id.trim();
    if (!usuarioId) {
      toast.error("Selecione um membro.");
      return;
    }
    const valor = Number.parseFloat(form.valor);
    if (Number.isNaN(valor) || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSubmitting(true);
    try {
      // Sempre salva no Dexie via repository + enfileira no sync_queue
      await mensalidadeRepository.create({
        usuario_id: usuarioId,
        valor,
        data_pagamento: form.data_pagamento || null,
        forma_pagamento: form.forma_pagamento || null,
      });
      toast.success(
        `Pagamento registrado.${!online ? " (aguardando sincronização)" : ""}`,
      );
      setForm(formVazio);
      // useLiveQuery atualiza a lista automaticamente
      if (online) {
        syncManager.run(getDeviceId()).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar pagamento. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const mensalidadesPorMembro = (usuarioId: string): Mensalidade[] =>
    (mensalidades ?? []).filter((m) => m.usuario_id === usuarioId);

  const nomeMembro = (usuarioId: string) => getNome(usuarioId);

  const totalVencidos = (membros ?? []).filter((m) =>
    isVencido(mensalidadesPorMembro(m.usuarioId)),
  ).length;
  const totalEmDia = (membros ?? []).length - totalVencidos;

  const membrosFiltrados = (membros ?? []).filter((m) => {
    const vencido = isVencido(mensalidadesPorMembro(m.usuarioId));
    if (filtro === "vencidos") return vencido;
    if (filtro === "em_dia") return !vencido;
    return true;
  });

  return (
    <div className="space-y-10">
      {/* Cabeçalho */}
      <div>
        <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f] mb-1">
          Mensalidades
        </h1>
        <p className="text-[#414846]">
          Gerencie os pagamentos
          {associacaoAtiva ? ` de ${associacaoAtiva.associacaoNome}` : ""}.
        </p>
      </div>

      {/* Banner offline */}
      {!online && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fff3e0] border border-[#E67E22]/30 text-sm text-[#9a4f00]">
          <WifiOff size={16} className="shrink-0" />
          <span>
            Sem conexão. Registros ficam na fila e serão enviados quando você reconectar.
          </span>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-[#414846]">
            <Users size={18} />
            <span className="text-sm font-medium">Total</span>
          </div>
          <p className="text-3xl font-bold text-[#01261f]">{(membros ?? []).length}</p>
        </div>
        <button
          type="button"
          className={cn(
            "bg-white rounded-2xl shadow-sm p-5 space-y-1 cursor-pointer transition-all text-left w-full",
            filtro === "em_dia" ? "ring-2 ring-emerald-400" : "hover:ring-2 hover:ring-emerald-300",
          )}
          onClick={() => setFiltro(filtro === "em_dia" ? "todos" : "em_dia")}
        >
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">Em dia</span>
          </div>
          <p className="text-3xl font-bold text-emerald-700">{totalEmDia}</p>
        </button>
        <button
          type="button"
          className={cn(
            "bg-white rounded-2xl shadow-sm p-5 space-y-1 cursor-pointer transition-all text-left w-full",
            filtro === "vencidos" ? "ring-2 ring-red-400" : "hover:ring-2 hover:ring-red-300",
          )}
          onClick={() => setFiltro(filtro === "vencidos" ? "todos" : "vencidos")}
        >
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">Vencidos</span>
          </div>
          <p className="text-3xl font-bold text-red-700">{totalVencidos}</p>
        </button>
      </div>

      {/* Lista de membros por status */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-xl font-bold text-[#01261f]">
            Status por Membro
          </h2>
          <span className="text-xs text-[#414846]">{labelVencimento()}</span>
        </div>

        {membrosFiltrados.length === 0 ? (
          <div className="bg-[#f6f3ee] rounded-xl p-6 text-center text-[#414846]">
            {filtro === "todos" ? "Nenhum membro ativo." : "Nenhum membro nessa categoria."}
          </div>
        ) : (
          <div className="space-y-2">
            {membrosFiltrados.map((m) => {
              const vencido = isVencido(mensalidadesPorMembro(m.usuarioId));
              const ultimo = mensalidadesPorMembro(m.usuarioId).sort((x, y) =>
                (y.data_pagamento ?? "").localeCompare(x.data_pagamento ?? ""),
              )[0];
              return (
                <div key={m.usuarioId} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                      vencido ? "bg-red-100" : "bg-emerald-100",
                    )}
                  >
                    {vencido ? (
                      <AlertCircle size={18} className="text-red-600" />
                    ) : (
                      <CheckCircle size={18} className="text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#01261f] text-sm truncate">{getNome(m.usuarioId)}</p>
                    <p className="text-xs text-[#414846]">
                      {(() => {
                        if (vencido) return "Sem pagamento no mês";
                        if (ultimo?.data_pagamento) return `Pago em ${formatDate(ultimo.data_pagamento)}`;
                        return "Em dia";
                      })()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold px-2.5 py-1 rounded-full",
                      vencido ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700",
                    )}
                  >
                    {vencido ? "Vencido" : "Em dia"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Formulário de registro */}
      <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[#01261f] flex items-center justify-center text-white">
            <BanknoteArrowUp size={20} />
          </div>
          <h2 className="font-headline text-lg font-bold text-[#01261f]">
            Registrar Pagamento
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="usuario_id" className="text-[#01261f] font-medium">
              Membro <span className="text-red-500">*</span>
            </Label>
            <select
              id="usuario_id"
              name="usuario_id"
              value={form.usuario_id}
              onChange={handleChange}
              required
              className={cn(
                "h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                !form.usuario_id && "text-muted-foreground",
              )}
            >
              <option value="" disabled>
                Selecione um membro
              </option>
              {(membros ?? []).map((m) => (
                <option key={m.usuarioId} value={m.usuarioId}>
                  {getNome(m.usuarioId)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="valor" className="text-[#01261f] font-medium">
                Valor (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="valor"
                name="valor"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={handleChange}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_pagamento" className="text-[#01261f] font-medium">
                Data do Pagamento
              </Label>
              <Input
                id="data_pagamento"
                name="data_pagamento"
                type="date"
                value={form.data_pagamento}
                onChange={handleChange}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="forma_pagamento" className="text-[#01261f] font-medium">
              Forma de Pagamento
            </Label>
            <select
              id="forma_pagamento"
              name="forma_pagamento"
              value={form.forma_pagamento}
              onChange={handleChange}
              className={cn(
                "h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
            >
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting || membros.length === 0}
              className="bg-[#01261f] hover:bg-[#1a3c34] text-white h-10 px-6 rounded-lg font-medium"
            >
              {submitting ? "Salvando..." : "Registrar Pagamento"}
            </Button>
          </div>
        </form>
      </div>

      {/* Histórico completo */}
      <div className="space-y-4">
        <h2 className="font-headline text-xl font-bold text-[#01261f]">
          Histórico de Pagamentos
        </h2>
        {mensalidades.filter((m) => !m.deleted_at).length === 0 ? (
          <div className="bg-[#f6f3ee] rounded-xl p-8 text-center text-[#414846]">
            Nenhum pagamento registrado ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {mensalidades
              .filter((m) => !m.deleted_at)
              .map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4"
                >
                  <div className="w-9 h-9 rounded-full bg-[#f6f3ee] flex items-center justify-center flex-shrink-0">
                    <Clock size={18} className="text-[#01261f]/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#01261f] text-sm truncate">
                      {m.usuario_id ? nomeMembro(m.usuario_id) : "—"}
                    </p>
                    <p className="text-xs text-[#414846]">
                      {m.data_pagamento ? formatDate(m.data_pagamento) : "Sem data"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <FormaPagamentoBadge forma={m.forma_pagamento ?? undefined} />
                    <span className="font-bold text-[#01261f]">
                      {formatCurrency(m.valor)}
                    </span>
                    <CheckCircle size={16} className="text-emerald-600" />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MensalidadesPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const isAdmin = associacaoAtiva?.role === "adm";

  const navItems = isAdmin ? adminNavItems : memberNavItems;

  return (
    <AppLayout navItems={navItems} title="Mensalidades">
      <Toaster />
      <div className="p-6 lg:p-12 max-w-4xl mx-auto">
        {isAdmin ? <AdminView /> : <AssociadoView />}
      </div>
    </AppLayout>
  );
}
