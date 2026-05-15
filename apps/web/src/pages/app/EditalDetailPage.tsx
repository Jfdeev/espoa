import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  MapPin,
  ExternalLink,
  Trash2,
  Pencil,
  WifiOff,
  Building2,
  FileText,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
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
    month: "long",
    year: "numeric",
  });
}

function formatBRL(value?: number) {
  if (value == null) return null;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
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

export default function EditalDetailPage() {
  const { editalId } = useParams<{ editalId: string }>();
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const edital = useLiveQuery<EditalPnae | null>(
    async () => {
      if (!editalId) return null;
      const record = await db.edital_pnae.get(editalId);
      if (!record || record.deleted_at) return null;
      return record;
    },
    null,
    [editalId],
  );

  if (!editalId) {
    return (
      <AppLayout navItems={adminNavItems} title="Portal do Admin">
        <div className="p-6 lg:p-12 max-w-3xl mx-auto">
          <p className="text-[#414846]">ID do edital não informado.</p>
        </div>
      </AppLayout>
    );
  }

  if (edital === null) {
    return (
      <AppLayout navItems={adminNavItems} title="Portal do Admin">
        <div className="p-6 lg:p-12 max-w-3xl mx-auto space-y-6">
          <Button
            variant="outline"
            onClick={() => navigate("/app/editais")}
            size="sm"
          >
            <ArrowLeft size={14} />
            Voltar
          </Button>
          <div className="rounded-xl border border-[#c1c8c4]/30 bg-white p-12 flex flex-col items-center justify-center gap-3 text-center">
            <FileText size={28} className="text-[#414846]/60" />
            <p className="font-medium text-[#1c1c19]">Edital não encontrado</p>
            <p className="text-sm text-[#414846]/60">
              Ele pode ter sido removido ou ainda não foi sincronizado para este
              dispositivo.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const badge = statusBadge(edital.status);
  const days = daysUntil(edital.data_limite);

  async function handleEdit(values: EditalPnaeFormSubmit) {
    try {
      await editalPnaeRepository.update(editalId!, values);
      setShowEdit(false);
      toast.success(
        `Edital atualizado.${!online ? " (aguardando sincronização)" : ""}`,
      );
      if (online) {
        syncManager.run(getDeviceId()).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar o edital. Tente novamente.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await editalPnaeRepository.delete(editalId!);
      toast.success(
        `Edital removido.${!online ? " (aguardando sincronização)" : ""}`,
      );
      if (online) {
        syncManager.run(getDeviceId()).catch(() => {});
      }
      navigate("/app/editais");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover o edital.");
      setDeleting(false);
    }
  }

  return (
    <AppLayout navItems={adminNavItems} title="Portal do Admin">
      <div className="p-6 lg:p-12 max-w-4xl mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => navigate("/app/editais")}
            size="sm"
          >
            <ArrowLeft size={14} />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEdit(true)}
            >
              <Pencil size={14} />
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 size={14} />
              Excluir
            </Button>
          </div>
        </div>

        {!online && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fff3e0] border border-[#E67E22]/30 text-sm text-[#9a4f00]">
            <WifiOff size={16} className="shrink-0" />
            <span>
              Sem conexão. Alterações ficam na fila e serão enviadas ao
              reconectar.
            </span>
          </div>
        )}

        {/* Header card */}
        <div className="rounded-xl border border-[#c1c8c4]/30 bg-white p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <h1 className="font-headline text-2xl lg:text-3xl font-bold text-[#01261f]">
                {edital.titulo}
              </h1>
              {edital.numero_edital && (
                <p className="text-sm text-[#414846]/70 mt-1">
                  Edital nº {edital.numero_edital}
                </p>
              )}
            </div>
            <span
              className={cn(
                "shrink-0 inline-flex items-center text-xs font-medium px-3 py-1 rounded-full border",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          </div>

          {edital.descricao && (
            <p className="text-sm text-[#414846] whitespace-pre-wrap">
              {edital.descricao}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <InfoRow icon={<Building2 size={14} />} label="Órgão responsável">
              {edital.orgao_responsavel ?? "—"}
            </InfoRow>
            <InfoRow icon={<MapPin size={14} />} label="Local">
              {edital.municipio || edital.estado
                ? `${edital.municipio ?? ""}${
                    edital.municipio && edital.estado ? " / " : ""
                  }${edital.estado ?? ""}`
                : "—"}
            </InfoRow>
            <InfoRow icon={<CalendarDays size={14} />} label="Data de abertura">
              {formatDateBR(edital.data_abertura)}
            </InfoRow>
            <InfoRow icon={<CalendarClock size={14} />} label="Data limite">
              <div className="flex items-center gap-2 flex-wrap">
                <span>{formatDateBR(edital.data_limite)}</span>
                {days !== null && edital.status !== "encerrado" && (
                  <DeadlinePill days={days} />
                )}
              </div>
            </InfoRow>
            {edital.valor_total_estimado != null && (
              <InfoRow
                icon={<Sparkles size={14} />}
                label="Valor estimado"
                className="sm:col-span-2"
              >
                {formatBRL(edital.valor_total_estimado)}
              </InfoRow>
            )}
            {edital.link_original && (
              <InfoRow
                icon={<ExternalLink size={14} />}
                label="Edital oficial"
                className="sm:col-span-2"
              >
                <a
                  href={edital.link_original}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#01261f] underline underline-offset-2 hover:text-[#1a3c34] break-all"
                >
                  {edital.link_original}
                </a>
              </InfoRow>
            )}
          </div>
        </div>

        {/* Internal notes */}
        <section className="rounded-xl border border-[#c1c8c4]/30 bg-white p-6">
          <h2 className="font-headline text-lg font-bold text-[#01261f] mb-2">
            Observações internas
          </h2>
          {edital.observacoes_internas ? (
            <p className="text-sm text-[#414846] whitespace-pre-wrap">
              {edital.observacoes_internas}
            </p>
          ) : (
            <p className="text-sm text-[#414846]/50 italic">
              Sem observações registradas. Use este espaço para anotações sobre
              prazos internos, status do projeto de venda e responsabilidades.
            </p>
          )}
        </section>

        {/* Future verticals placeholder */}
        <section className="rounded-xl border border-dashed border-[#1a3c34]/30 bg-[#f6f3ee]/40 p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#01261f]">
            <Sparkles size={16} />
            <h2 className="font-headline text-base font-bold">Em breve</h2>
          </div>
          <p className="text-sm text-[#414846]">
            Esta tela será o ponto de partida para vertentes que ajudarão sua
            associação a se preparar melhor para cada edital:
          </p>
          <ul className="text-sm text-[#414846] space-y-1 pl-4 list-disc marker:text-[#1a3c34]/40">
            <li>Diagnóstico de prontidão (CAFs, alvará sanitário, NF)</li>
            <li>Cruzamento entre produção registrada e demanda do edital</li>
            <li>Calculadora de limite por DAP/CAF (R$ 20 mil/ano)</li>
            <li>Histórico de participação e lições aprendidas</li>
            <li>Insights via IA sobre conformidade e priorização</li>
          </ul>
        </section>

        <p className="text-xs text-[#414846]/50">
          Última atualização: {formatDateBR(edital.updated_at)} · versão{" "}
          {edital.version}
        </p>
      </div>

      {/* Edit modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>Editar edital</DialogTitle>
            <DialogDescription>
              Atualize informações do edital. As alterações são sincronizadas
              automaticamente.
            </DialogDescription>
          </DialogHeader>
          <EditalPnaeForm
            initial={edital}
            onSubmit={handleEdit}
            onCancel={() => setShowEdit(false)}
            submitLabel="Salvar alterações"
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Excluir edital</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{edital.titulo}</strong>?
              Esta ação remove o edital da lista. Você pode pedir que um
              administrador o restaure se necessário.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function InfoRow({
  icon,
  label,
  className,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-1.5 text-xs text-[#414846]/60 mb-1">
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm text-[#1c1c19]">{children}</div>
    </div>
  );
}

function DeadlinePill({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-[#ba1a1a]/10 text-[#ba1a1a]">
        Vencido há {Math.abs(days)} dia{Math.abs(days) === 1 ? "" : "s"}
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-[#ba1a1a]/10 text-[#ba1a1a]">
        Vence hoje
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-[#E67E22]/10 text-[#9a4f00]">
        Faltam {days} dia{days === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-[#9ca3af]/10 text-[#414846]/70">
      Faltam {days} dias
    </span>
  );
}
