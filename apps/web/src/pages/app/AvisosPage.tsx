import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Megaphone, Plus, Trash2, Pencil, Calendar } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { Aviso } from "@/database/types";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { avisoRepository } from "@/repositories/aviso.repository";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";

function formatDate(iso?: string | null): string {
  if (!iso) return "Sem expiração";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExpirado(aviso: Aviso): boolean {
  if (!aviso.expira_em) return false;
  return new Date(aviso.expira_em).getTime() < Date.now();
}

export default function AvisosPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Aviso | null>(null);
  const [deleting, setDeleting] = useState<Aviso | null>(null);

  const assocId = associacaoAtiva?.associacaoId;

  // Live query: reage automaticamente a updates locais (offline) ou via sync
  const avisos = useLiveQuery<Aviso[] | undefined>(
    async () => {
      if (!assocId) return [];
      const rows = await db.aviso
        .where("associacao_id")
        .equals(assocId)
        .filter((a) => !a.deleted_at)
        .toArray();
      return rows.sort((a, b) =>
        (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
      );
    },
    undefined as Aviso[] | undefined,
    [assocId],
  );

  // Dispara um sync 1x para puxar avisos do servidor — fire-and-forget
  useEffect(() => {
    if (!assocId) return;
    syncManager.run(getDeviceId()).catch(() => {
      /* offline — Dexie tem o que tem */
    });
  }, [assocId]);

  // Early returns DEPOIS de todos os hooks para evitar "rendered fewer hooks than expected"
  if (!associacaoAtiva) return <Navigate to="/solicitacoes" replace />;
  if (associacaoAtiva.role !== "adm")
    return <Navigate to="/app" replace />;

  const loading = avisos === undefined;

  const handleSubmit = async (input: {
    titulo: string;
    mensagem: string;
    expira_em: string | null;
  }) => {
    try {
      if (editing?.id) {
        await avisoRepository.update(editing.id, input);
        toast.success("Aviso atualizado.");
      } else {
        await avisoRepository.create({
          associacao_id: associacaoAtiva.associacaoId,
          titulo: input.titulo,
          mensagem: input.mensagem,
          expira_em: input.expira_em,
        });
        toast.success("Aviso publicado.");
      }
      setShowForm(false);
      setEditing(null);
      // Dispara sync para enviar a mudança ao servidor (sem bloquear UI)
      syncManager.run(getDeviceId()).catch(() => {
        /* offline — fica na fila */
      });
    } catch {
      toast.error("Não foi possível salvar o aviso.");
    }
  };

  const handleDelete = async () => {
    if (!deleting?.id) return;
    try {
      await avisoRepository.delete(deleting.id);
      toast.success("Aviso removido.");
      setDeleting(null);
      syncManager.run(getDeviceId()).catch(() => {
        /* offline — fica na fila */
      });
    } catch {
      toast.error("Não foi possível remover o aviso.");
    }
  };

  return (
    <AppLayout navItems={adminNavItems} title="Quadro de Avisos">
      <div className="flex justify-center items-start pt-8 pb-12 px-6">
        <div className="max-w-3xl w-full flex flex-col gap-8">
          <header className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f]">
                Quadro de Avisos
              </h1>
              <p className="text-[#414846] mt-2">
                Publique recados curtos visíveis para todos os membros ativos.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus size={16} className="mr-2" />
              Novo aviso
            </Button>
          </header>

          {loading && (
            <div className="rounded-lg bg-white border border-[#c1c8c4]/30 p-8 text-center text-[#414846]">
              Carregando avisos...
            </div>
          )}

          {!loading && avisos && avisos.length === 0 && (
            <div className="rounded-lg bg-white border border-[#c1c8c4]/30 p-12 text-center">
              <Megaphone
                size={32}
                className="mx-auto mb-4 text-[#414846]/40"
              />
              <p className="text-[#414846]">
                Nenhum aviso publicado ainda.
              </p>
            </div>
          )}

          {!loading && avisos && avisos.length > 0 && (
            <div className="space-y-3">
              {avisos.map((aviso) => {
                const expirado = isExpirado(aviso);
                return (
                  <div
                    key={aviso.id}
                    className={`rounded-xl border p-5 ${
                      expirado
                        ? "bg-[#fcf9f4] border-[#c1c8c4]/30 opacity-60"
                        : "bg-white border-[#c1c8c4]/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-headline font-bold text-[#01261f]">
                          {aviso.titulo}
                          {expirado && (
                            <span className="ml-2 text-xs font-label text-[#414846]/70">
                              (expirado)
                            </span>
                          )}
                        </h3>
                        <p className="mt-2 text-sm text-[#414846] whitespace-pre-wrap">
                          {aviso.mensagem}
                        </p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-[#414846]/70">
                          <Calendar size={12} />
                          <span>Expira: {formatDate(aviso.expira_em)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditing(aviso);
                            setShowForm(true);
                          }}
                          className="p-2 rounded-lg hover:bg-[#1A3C34]/5 text-[#1A3C34]"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleting(aviso)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-rose-700"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Form modal */}
      <Dialog
        open={showForm}
        onOpenChange={(o) => {
          if (!o) {
            setShowForm(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar aviso" : "Novo aviso"}
            </DialogTitle>
            <DialogDescription>
              Mensagens curtas e diretas funcionam melhor para os membros.
            </DialogDescription>
          </DialogHeader>
          <AvisoForm
            initial={editing}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remover aviso</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{deleting?.titulo}</strong>? Os membros deixarão de ver
              esta mensagem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function AvisoForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Aviso | null;
  onSubmit: (data: {
    titulo: string;
    mensagem: string;
    expira_em: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [mensagem, setMensagem] = useState(initial?.mensagem ?? "");
  const [expiraEm, setExpiraEm] = useState(
    initial?.expira_em ? initial.expira_em.slice(0, 10) : "",
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim()) return;
    onSubmit({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      expira_em: expiraEm ? new Date(expiraEm + "T23:59:59").toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-label text-[#01261f] mb-1 block">
          Título *
        </label>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Reunião adiada"
          maxLength={200}
          required
        />
      </div>
      <div>
        <label className="text-sm font-label text-[#01261f] mb-1 block">
          Mensagem *
        </label>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Detalhe o aviso de forma simples."
          rows={4}
          required
          className="w-full rounded-md border border-[#c1c8c4]/40 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A3C34]/30"
        />
      </div>
      <div>
        <label className="text-sm font-label text-[#01261f] mb-1 block">
          Expira em (opcional)
        </label>
        <Input
          type="date"
          value={expiraEm}
          onChange={(e) => setExpiraEm(e.target.value)}
        />
        <p className="text-xs text-[#414846]/70 mt-1">
          Deixe em branco para o aviso ficar visível indefinidamente.
        </p>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{initial ? "Salvar" : "Publicar"}</Button>
      </DialogFooter>
    </form>
  );
}
