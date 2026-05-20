import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  FileText,
  CalendarDays,
  MapPin,
  Users,
  Pencil,
  Trash2,
  WifiOff,
  Download,
  Sparkles,
} from "lucide-react";
import { AtaResumoDialog } from "@/components/AtaResumoDialog";
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
import { Input } from "@/components/ui/input";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import { useOnlineStatus, isNetworkError } from "@/lib/network";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { db } from "@/database/db";
import api from "@/lib/api";
import { ataRepository } from "@/repositories/ata.repository";
import type { CreateAtaInput, UpdateAtaInput } from "@/repositories/ata.repository";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";
import type { Ata } from "@/database/types";

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

export default function AtasPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const online = useOnlineStatus();
  const assocId = associacaoAtiva?.associacaoId;

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAta, setEditingAta] = useState<Ata | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Ata | null>(null);
  const [resumoIaAta, setResumoIaAta] = useState<Ata | null>(null);
  const [atasApi, setAtasApi] = useState<Ata[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [fromLocal, setFromLocal] = useState(false);

  // Dexie fallback — usado quando offline ou API falhou
  const atasLocal = useLiveQuery<Ata[]>(
    async () => {
      if (!assocId) return [];
      return db.ata
        .where("associacao_id")
        .equals(assocId)
        .filter((a) => !a.deleted_at)
        .reverse()
        .sortBy("data");
    },
    [],
    [assocId],
  );

  const carregarDaApi = useCallback(async () => {
    if (!assocId || !online) {
      setFromLocal(true);
      setCarregando(false);
      return;
    }
    try {
      const { data } = await api.get<Ata[]>(`/atas?associacao_id=${assocId}`);
      // Sort by data DESC
      data.sort((a, b) => b.data.localeCompare(a.data));
      setAtasApi(data);
      setFromLocal(false);
    } catch (err) {
      if (isNetworkError(err)) {
        setFromLocal(true);
      } else {
        toast.error("Erro ao carregar atas.");
        setFromLocal(true);
      }
    } finally {
      setCarregando(false);
    }
  }, [assocId, online]);

  useEffect(() => {
    carregarDaApi();
  }, [carregarDaApi]);

  // Recarregar ao reconectar
  useEffect(() => {
    if (online && fromLocal) {
      carregarDaApi();
    }
  }, [online, fromLocal, carregarDaApi]);

  // Resolve dados: API quando disponível, Dexie como fallback
  const atas = atasApi ?? atasLocal;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return atas;
    return atas.filter(
      (a) =>
        a.titulo.toLowerCase().includes(term) ||
        (a.local ?? "").toLowerCase().includes(term) ||
        (a.participantes ?? "").toLowerCase().includes(term),
    );
  }, [atas, search]);

  function openCreate() {
    setEditingAta(null);
    setShowForm(true);
  }

  function openEdit(ata: Ata) {
    setEditingAta(ata);
    setShowForm(true);
  }

  async function handleSubmit(values: CreateAtaInput) {
    if (!assocId) {
      toast.error("Selecione uma associação ativa.");
      return;
    }
    try {
      if (editingAta?.id) {
        const update: UpdateAtaInput = {
          titulo: values.titulo,
          conteudo: values.conteudo,
          data: values.data,
          participantes: values.participantes,
          local: values.local,
        };
        await ataRepository.update(editingAta.id, update);
        toast.success(
          `Ata atualizada.${!online ? " (aguardando sincronização)" : ""}`,
        );
      } else {
        await ataRepository.create({ ...values, associacao_id: assocId });
        toast.success(
          `Ata criada.${!online ? " (aguardando sincronização)" : ""}`,
        );
      }
      if (online) {
        syncManager.run(getDeviceId()).catch(() => {});
        // Recarregar da API para ter dados atualizados do servidor
        carregarDaApi();
      }
      setShowForm(false);
      setEditingAta(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar a ata. Tente novamente.");
    }
  }

  async function handleDelete() {
    if (!showDeleteConfirm?.id) return;
    try {
      await ataRepository.delete(showDeleteConfirm.id);
      toast.success(
        `Ata removida.${!online ? " (aguardando sincronização)" : ""}`,
      );
      if (online) {
        syncManager.run(getDeviceId()).catch(() => {});
        carregarDaApi();
      }
    } catch {
      toast.error("Erro ao remover a ata.");
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  function exportPdf(ata: Ata) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Permita pop-ups para exportar o PDF.");
      return;
    }

    const dataFormatada = formatDateBR(ata.data);
    const nomeAssociacao = associacaoAtiva?.associacaoNome ?? "";

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ata - ${ata.titulo}</title>
  <style>
    @page {
      size: A4;
      margin: 25mm 20mm 25mm 20mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1c1c19;
      font-size: 13px;
      line-height: 1.6;
    }

    /* Header / Cabeçalho institucional */
    .header {
      text-align: center;
      border-bottom: 3px double #01261f;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .header .org-name {
      font-size: 18px;
      font-weight: bold;
      color: #01261f;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 4px;
    }
    .header .doc-type {
      font-size: 13px;
      color: #414846;
      font-style: italic;
    }

    /* Título da ata */
    .titulo {
      font-size: 17px;
      font-weight: bold;
      color: #01261f;
      text-align: center;
      margin-bottom: 24px;
      line-height: 1.4;
    }

    /* Informações da reunião */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      background: #f8f7f5;
      border: 1px solid #e5e2dd;
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 24px;
      font-size: 12.5px;
    }
    .info-grid .info-item {
      display: flex;
      gap: 6px;
    }
    .info-grid .info-item.full {
      grid-column: 1 / -1;
    }
    .info-grid .label {
      font-weight: bold;
      color: #01261f;
      white-space: nowrap;
    }
    .info-grid .value {
      color: #333;
    }

    /* Separador */
    .divider {
      border: none;
      border-top: 1px solid #d4d0ca;
      margin: 24px 0;
    }

    /* Corpo da ata */
    .section-title {
      font-size: 13px;
      font-weight: bold;
      color: #01261f;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e5e2dd;
    }
    .conteudo {
      font-size: 13px;
      line-height: 1.9;
      white-space: pre-wrap;
      text-align: justify;
      color: #222;
    }

    /* Área de assinaturas */
    .assinaturas {
      margin-top: 60px;
      page-break-inside: avoid;
    }
    .assinaturas .section-title {
      margin-bottom: 40px;
    }
    .assinatura-line {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      margin-bottom: 48px;
    }
    .assinatura-slot {
      flex: 1;
      text-align: center;
    }
    .assinatura-slot .line {
      border-top: 1px solid #333;
      margin-bottom: 4px;
    }
    .assinatura-slot .placeholder {
      font-size: 11px;
      color: #666;
    }

    /* Rodapé */
    .footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e5e2dd;
      font-size: 10px;
      color: #999;
      text-align: center;
    }

    @media print {
      body { padding: 0; margin: 0; }
      .footer { position: fixed; bottom: 0; left: 0; right: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="org-name">${nomeAssociacao || "Associação"}</div>
    <div class="doc-type">Ata de Reunião</div>
  </div>

  <div class="titulo">${ata.titulo}</div>

  <div class="info-grid">
    <div class="info-item">
      <span class="label">Data:</span>
      <span class="value">${dataFormatada}</span>
    </div>
    ${ata.local ? `<div class="info-item">
      <span class="label">Local:</span>
      <span class="value">${ata.local}</span>
    </div>` : ""}
    ${ata.participantes ? `<div class="info-item full">
      <span class="label">Participantes:</span>
      <span class="value">${ata.participantes}</span>
    </div>` : ""}
  </div>

  <div class="section-title">Registro da Reunião</div>
  <div class="conteudo">${ata.conteudo}</div>

  <div class="assinaturas">
    <div class="section-title">Assinaturas</div>
    <div class="assinatura-line">
      <div class="assinatura-slot">
        <div class="line"></div>
        <div class="placeholder">Presidente</div>
      </div>
      <div class="assinatura-slot">
        <div class="line"></div>
        <div class="placeholder">Secretário(a)</div>
      </div>
    </div>
    <div class="assinatura-line">
      <div class="assinatura-slot">
        <div class="line"></div>
        <div class="placeholder">Participante</div>
      </div>
      <div class="assinatura-slot">
        <div class="line"></div>
        <div class="placeholder">Participante</div>
      </div>
    </div>
  </div>

  <div class="footer">
    Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${nomeAssociacao} · Espoa
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <AppLayout navItems={adminNavItems} title="Portal do Admin">
      <div className="p-6 lg:p-12 max-w-6xl mx-auto space-y-8">
        {/* Hero */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-headline text-3xl lg:text-4xl font-bold text-md-primary mb-1">
              Atas de Reuniões
            </h1>
            <p className="text-[#414846]">
              Registre e consulte as atas da{" "}
              {associacaoAtiva?.associacaoNome && (
                <span className="font-medium text-md-primary">
                  {associacaoAtiva.associacaoNome}
                </span>
              )}
              .
            </p>
          </div>
          <Button onClick={openCreate} disabled={!assocId}>
            <Plus size={16} />
            Nova ata
          </Button>
        </div>

        {/* Offline / local data banner */}
        {(!online || fromLocal) && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fff3e0] border border-[#E67E22]/30 text-sm text-[#9a4f00]">
            <WifiOff size={16} className="shrink-0" />
            <span>
              {fromLocal
                ? "Dados locais. Cadastros e edições ficam na fila e serão enviados quando você reconectar."
                : "Sem conexão. Cadastros e edições ficam na fila e serão enviados quando você reconectar."}
            </span>
          </div>
        )}

        {carregando ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-[#1a3c34] border-t-transparent animate-spin" />
          </div>
        ) : (
        <>
        {/* Search */}
        {atas.length > 0 && (
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#414846]/50 pointer-events-none"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, local ou participantes..."
              className="pl-9 h-10"
            />
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            hasSearch={search.trim().length > 0}
            disabled={!assocId}
            onClickNew={openCreate}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((ata) => (
              <AtaCard
                key={ata.id}
                ata={ata}
                onEdit={() => openEdit(ata)}
                onDelete={() => setShowDeleteConfirm(ata)}
                onExportPdf={() => exportPdf(ata)}
                onResumoIa={() => setResumoIaAta(ata)}
              />
            ))}
          </div>
        )}
        </>
        )}
      </div>

      {/* Create / Edit modal */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingAta(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>
              {editingAta ? "Editar ata" : "Nova ata de reunião"}
            </DialogTitle>
            <DialogDescription>
              {editingAta
                ? "Altere os campos desejados e salve."
                : "Preencha os dados da reunião para registrar a ata."}
            </DialogDescription>
          </DialogHeader>
          <AtaForm
            initialData={editingAta}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingAta(null);
            }}
            submitLabel={editingAta ? "Salvar alterações" : "Registrar ata"}
          />
        </DialogContent>
      </Dialog>

      {/* Resumo IA */}
      <AtaResumoDialog
        ataId={resumoIaAta?.id ?? null}
        tituloAta={resumoIaAta?.titulo ?? null}
        open={!!resumoIaAta}
        onClose={() => setResumoIaAta(null)}
      />

      {/* Delete confirmation */}
      <Dialog
        open={!!showDeleteConfirm}
        onOpenChange={(open) => {
          if (!open) setShowDeleteConfirm(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remover ata</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a ata{" "}
              <strong>{showDeleteConfirm?.titulo}</strong>? Essa ação pode ser
              revertida por um administrador.
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
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-[#ba1a1a] hover:bg-[#93000a] rounded-lg transition-colors"
            >
              Remover
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// ── AtaCard ─────────────────────────────────────────────────────────────────

function AtaCard({
  ata,
  onEdit,
  onDelete,
  onExportPdf,
  onResumoIa,
}: {
  ata: Ata;
  onEdit: () => void;
  onDelete: () => void;
  onExportPdf: () => void;
  onResumoIa: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#c1c8c4]/30 bg-white p-4 flex flex-col gap-3 hover:border-[#1a3c34]/40 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-md-primary line-clamp-2">{ata.titulo}</h3>
      </div>

      <p className="text-sm text-[#414846]/80 line-clamp-3">{ata.conteudo}</p>

      <div className="flex flex-col gap-1.5 text-xs text-[#414846]/70 mt-auto">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={12} />
          <span>{formatDateBR(ata.data)}</span>
        </div>
        {ata.local && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} />
            <span className="truncate">{ata.local}</span>
          </div>
        )}
        {ata.participantes && (
          <div className="flex items-center gap-1.5">
            <Users size={12} />
            <span className="truncate">{ata.participantes}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[#f0ede8]">
        <button
          onClick={onResumoIa}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1A3C34] bg-[#1A3C34]/5 hover:bg-[#1A3C34]/10 transition-colors"
          title="Resumo simples gerado por IA"
        >
          <Sparkles size={12} />
          Resumo IA
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-md-primary hover:bg-[#f6f3ee] transition-colors"
        >
          <Pencil size={12} />
          Editar
        </button>
        <button
          onClick={onExportPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-md-primary hover:bg-[#f6f3ee] transition-colors"
        >
          <Download size={12} />
          PDF
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors ml-auto"
        >
          <Trash2 size={12} />
          Remover
        </button>
      </div>
    </div>
  );
}

// ── AtaForm ─────────────────────────────────────────────────────────────────

function AtaForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initialData?: Ata | null;
  onSubmit: (values: CreateAtaInput) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [titulo, setTitulo] = useState(initialData?.titulo ?? "");
  const [data, setData] = useState(
    initialData?.data ?? new Date().toISOString().slice(0, 10),
  );
  const [local, setLocal] = useState(initialData?.local ?? "");
  const [participantes, setParticipantes] = useState(
    initialData?.participantes ?? "",
  );
  const [conteudo, setConteudo] = useState(initialData?.conteudo ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim() || !data) return;
    setSubmitting(true);
    try {
      await onSubmit({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        data,
        participantes: participantes.trim() || null,
        local: local.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="titulo"
          className="block text-sm font-medium text-md-primary mb-1"
        >
          Título *
        </label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Assembleia Ordinária - Maio 2026"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="data"
            className="block text-sm font-medium text-md-primary mb-1"
          >
            Data *
          </label>
          <Input
            id="data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            htmlFor="local"
            className="block text-sm font-medium text-md-primary mb-1"
          >
            Local
          </label>
          <Input
            id="local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex: Sede da Associação"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="participantes"
          className="block text-sm font-medium text-md-primary mb-1"
        >
          Participantes
        </label>
        <Input
          id="participantes"
          value={participantes}
          onChange={(e) => setParticipantes(e.target.value)}
          placeholder="Ex: João Silva, Maria Santos, Pedro Oliveira"
        />
      </div>

      <div>
        <label
          htmlFor="conteudo"
          className="block text-sm font-medium text-md-primary mb-1"
        >
          Conteúdo *
        </label>
        <textarea
          id="conteudo"
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Descreva os assuntos discutidos, decisões tomadas e encaminhamentos..."
          required
          rows={10}
          className="flex w-full rounded-xl border border-[#c1c8c4]/50 bg-white px-3 py-2 text-sm text-[#1c1c19] placeholder:text-[#414846]/40 focus:outline-none focus:ring-2 focus:ring-[#1a3c34]/20 focus:border-[#1a3c34] transition-all resize-y"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-[#414846] bg-[#f0ede8] hover:bg-[#e5e2dd] rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <Button type="submit" disabled={submitting || !titulo.trim() || !conteudo.trim() || !data}>
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ── EmptyState ──────────────────────────────────────────────────────────────

function EmptyState({
  hasSearch,
  disabled,
  onClickNew,
}: {
  hasSearch: boolean;
  disabled: boolean;
  onClickNew: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#c1c8c4]/30 bg-white p-12 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-[#f6f3ee] flex items-center justify-center">
        <FileText size={26} className="text-[#414846]/60" />
      </div>
      {hasSearch ? (
        <>
          <p className="font-medium text-[#1c1c19]">
            Nenhuma ata encontrada com essa busca
          </p>
          <p className="text-sm text-[#414846]/60">
            Ajuste o termo de busca para ver mais resultados.
          </p>
        </>
      ) : (
        <>
          <p className="font-medium text-[#1c1c19]">
            Nenhuma ata registrada ainda
          </p>
          <p className="text-sm text-[#414846]/60 max-w-md">
            Registre as atas das reuniões da associação para manter um histórico
            organizado e acessível a todos os membros.
          </p>
          <Button onClick={onClickNew} disabled={disabled} className="mt-2">
            <Plus size={16} />
            Registrar primeira ata
          </Button>
        </>
      )}
    </div>
  );
}
