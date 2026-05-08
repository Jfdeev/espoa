import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Search,
  CalendarClock,
  MapPin,
  ExternalLink,
  WifiOff,
  FileText,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import { useOnlineStatus } from "@/lib/network";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { db } from "@/database/db";
import { editalPnaeRepository } from "@/repositories/edital-pnae.repository";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";
import {
  EditalPnaeForm,
  type EditalPnaeFormSubmit,
} from "@/components/EditalPnaeForm";
import type { EditalPnae } from "@/database/types";

type StatusFilter = "todos" | "aberto" | "em_analise" | "encerrado";
type SortOrder = "data_limite_asc" | "data_limite_desc" | "atualizado_desc";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "aberto", label: "Aberto" },
  { value: "em_analise", label: "Em análise" },
  { value: "encerrado", label: "Encerrado" },
];

function statusBadge(status: EditalPnae["status"]) {
  switch (status) {
    case "aberto":
      return {
        label: "Aberto",
        className: "bg-[#22c55e]/10 text-[#15803d] border-[#22c55e]/30",
      };
    case "em_analise":
      return {
        label: "Em análise",
        className: "bg-[#E67E22]/10 text-[#9a4f00] border-[#E67E22]/30",
      };
    case "encerrado":
    default:
      return {
        label: "Encerrado",
        className: "bg-[#9ca3af]/10 text-[#414846] border-[#9ca3af]/30",
      };
  }
}

function formatDateBR(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function DeadlineHint({ dataLimite, status }: { dataLimite: string; status: EditalPnae["status"] }) {
  const days = daysUntil(dataLimite);
  if (days === null || status === "encerrado") return null;

  if (days < 0) {
    return (
      <span className="text-xs font-medium text-[#ba1a1a]">
        Prazo vencido há {Math.abs(days)} dia{Math.abs(days) === 1 ? "" : "s"}
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="text-xs font-bold text-[#ba1a1a]">Vence hoje</span>
    );
  }
  if (days <= 7) {
    return (
      <span className="text-xs font-medium text-[#9a4f00]">
        Faltam {days} dia{days === 1 ? "" : "s"}
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="text-xs text-[#414846]/70">Faltam {days} dias</span>
    );
  }
  return null;
}

export default function EditaisPage() {
  const navigate = useNavigate();
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const online = useOnlineStatus();
  const assocId = associacaoAtiva?.associacaoId;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [sortOrder, setSortOrder] = useState<SortOrder>("data_limite_asc");
  const [showCreate, setShowCreate] = useState(false);

  const editais = useLiveQuery<EditalPnae[]>(
    async () => {
      if (!assocId) return [];
      return db.edital_pnae
        .where("associacao_id")
        .equals(assocId)
        .filter((e) => !e.deleted_at)
        .toArray();
    },
    [],
    [assocId],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = editais;

    if (statusFilter !== "todos") {
      list = list.filter((e) => e.status === statusFilter);
    }
    if (term) {
      list = list.filter(
        (e) =>
          e.titulo.toLowerCase().includes(term) ||
          (e.municipio ?? "").toLowerCase().includes(term) ||
          (e.numero_edital ?? "").toLowerCase().includes(term) ||
          (e.orgao_responsavel ?? "").toLowerCase().includes(term),
      );
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortOrder) {
        case "data_limite_desc":
          return b.data_limite.localeCompare(a.data_limite);
        case "atualizado_desc":
          return b.updated_at.localeCompare(a.updated_at);
        case "data_limite_asc":
        default:
          return a.data_limite.localeCompare(b.data_limite);
      }
    });
    return sorted;
  }, [editais, search, statusFilter, sortOrder]);

  const counts = useMemo(() => {
    const c = { aberto: 0, em_analise: 0, encerrado: 0, total: editais.length };
    for (const e of editais) {
      c[e.status] = (c[e.status] ?? 0) + 1;
    }
    return c;
  }, [editais]);

  async function handleCreate(values: EditalPnaeFormSubmit) {
    if (!assocId) {
      toast.error("Selecione uma associação ativa antes de cadastrar editais.");
      return;
    }
    try {
      const created = await editalPnaeRepository.create({
        ...values,
        associacao_id: assocId,
      });
      setShowCreate(false);
      toast.success(
        `Edital cadastrado.${!online ? " (aguardando sincronização)" : ""}`,
      );
      if (online) {
        syncManager.run(getDeviceId()).catch(() => {});
      }
      navigate(`/app/editais/${created.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cadastrar o edital. Tente novamente.");
    }
  }

  return (
    <AppLayout navItems={adminNavItems} title="Portal do Admin">
      <div className="p-6 lg:p-12 max-w-6xl mx-auto space-y-8">
        {/* Hero */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f] mb-1">
              Editais PNAE
            </h1>
            <p className="text-[#414846]">
              Acompanhe oportunidades do Programa Nacional de Alimentação Escolar
              {associacaoAtiva?.associacaoNome && (
                <>
                  {" "}para{" "}
                  <span className="font-medium text-[#01261f]">
                    {associacaoAtiva.associacaoNome}
                  </span>
                </>
              )}
              .
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} disabled={!assocId}>
            <Plus size={16} />
            Novo edital
          </Button>
        </div>

        {/* Offline banner */}
        {!online && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fff3e0] border border-[#E67E22]/30 text-sm text-[#9a4f00]">
            <WifiOff size={16} className="shrink-0" />
            <span>
              Sem conexão. Cadastros e edições ficam na fila e serão enviados
              quando você reconectar.
            </span>
          </div>
        )}

        {/* Status summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Total" value={counts.total} />
          <SummaryCard label="Abertos" value={counts.aberto} accent="#22c55e" />
          <SummaryCard
            label="Em análise"
            value={counts.em_analise}
            accent="#E67E22"
          />
          <SummaryCard
            label="Encerrados"
            value={counts.encerrado}
            accent="#9ca3af"
          />
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#414846]/50 pointer-events-none"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, número, município ou órgão..."
              className="pl-9 h-10"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center gap-1 text-xs text-[#414846]/60 mr-1">
              <Filter size={12} /> Status:
            </span>
            {STATUS_FILTERS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  statusFilter === opt.value
                    ? "bg-[#01261f] text-white border-[#01261f]"
                    : "bg-white text-[#414846] border-[#c1c8c4]/50 hover:bg-[#f6f3ee]",
                )}
              >
                {opt.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="sort" className="text-xs text-[#414846]/60">
                Ordenar:
              </label>
              <select
                id="sort"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="h-8 rounded-lg border border-[#c1c8c4]/50 bg-white px-2 text-xs"
              >
                <option value="data_limite_asc">Prazo (mais próximo)</option>
                <option value="data_limite_desc">Prazo (mais distante)</option>
                <option value="atualizado_desc">Atualização recente</option>
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            hasFilters={search.trim().length > 0 || statusFilter !== "todos"}
            disabled={!assocId}
            onClickNew={() => setShowCreate(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((edital) => (
              <EditalCard
                key={edital.id}
                edital={edital}
                onClick={() => navigate(`/app/editais/${edital.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>Novo edital PNAE</DialogTitle>
            <DialogDescription>
              Cadastre um edital para acompanhar prazos e organizar a participação.
            </DialogDescription>
          </DialogHeader>
          <EditalPnaeForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            submitLabel="Cadastrar edital"
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[#c1c8c4]/30 bg-white p-4">
      <p className="text-xs text-[#414846]/60 font-medium uppercase tracking-wider">
        {label}
      </p>
      <p
        className="text-2xl font-bold mt-1"
        style={{ color: accent ?? "#01261f" }}
      >
        {value}
      </p>
    </div>
  );
}

function EditalCard({
  edital,
  onClick,
}: {
  edital: EditalPnae;
  onClick: () => void;
}) {
  const badge = statusBadge(edital.status);
  const local =
    edital.municipio && edital.estado
      ? `${edital.municipio} / ${edital.estado}`
      : edital.municipio ?? edital.estado ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-[#c1c8c4]/30 bg-white p-4 hover:border-[#1a3c34]/40 hover:shadow-sm transition-all flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-[#01261f] line-clamp-2">
            {edital.titulo}
          </h3>
          {edital.numero_edital && (
            <p className="text-xs text-[#414846]/60 mt-0.5">
              Nº {edital.numero_edital}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      </div>

      {edital.descricao && (
        <p className="text-sm text-[#414846]/80 line-clamp-2">
          {edital.descricao}
        </p>
      )}

      <div className="flex flex-col gap-1.5 text-xs text-[#414846]/70 mt-auto">
        {local && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} />
            <span className="truncate">{local}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <CalendarClock size={12} />
          <span>Prazo: {formatDateBR(edital.data_limite)}</span>
          <DeadlineHint
            dataLimite={edital.data_limite}
            status={edital.status}
          />
        </div>
        {edital.link_original && (
          <div className="flex items-center gap-1.5 truncate">
            <ExternalLink size={12} />
            <span className="truncate">Edital oficial disponível</span>
          </div>
        )}
      </div>
    </button>
  );
}

function EmptyState({
  hasFilters,
  disabled,
  onClickNew,
}: {
  hasFilters: boolean;
  disabled: boolean;
  onClickNew: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#c1c8c4]/30 bg-white p-12 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-[#f6f3ee] flex items-center justify-center">
        <FileText size={26} className="text-[#414846]/60" />
      </div>
      {hasFilters ? (
        <>
          <p className="font-medium text-[#1c1c19]">
            Nenhum edital encontrado com esses filtros
          </p>
          <p className="text-sm text-[#414846]/60">
            Ajuste a busca ou os filtros para ver mais resultados.
          </p>
        </>
      ) : (
        <>
          <p className="font-medium text-[#1c1c19]">
            Nenhum edital cadastrado ainda
          </p>
          <p className="text-sm text-[#414846]/60 max-w-md">
            Cadastre as chamadas públicas que sua associação está acompanhando
            para organizar prazos e centralizar as informações.
          </p>
          <Button
            onClick={onClickNew}
            disabled={disabled}
            className="mt-2"
          >
            <Plus size={16} />
            Cadastrar primeiro edital
          </Button>
        </>
      )}
    </div>
  );
}
