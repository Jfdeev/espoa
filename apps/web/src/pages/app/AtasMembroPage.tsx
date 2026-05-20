import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  MapPin,
  Users,
  Sparkles,
  Search,
} from "lucide-react";
import AppLayout from "./AppLayout";
import { memberNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";
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
import { Button } from "@/components/ui/button";
import { AtaResumoDialog } from "@/components/AtaResumoDialog";
import type { Ata } from "@/database/types";

function formatDateBR(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function AtasMembroPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const assocId = associacaoAtiva?.associacaoId;

  const [busca, setBusca] = useState("");
  const [verAta, setVerAta] = useState<Ata | null>(null);
  const [resumoAta, setResumoAta] = useState<Ata | null>(null);

  // Live query: reage automaticamente a updates do sync
  const atas = useLiveQuery<Ata[] | undefined>(
    async () => {
      if (!assocId) return [];
      const rows = await db.ata
        .where("associacao_id")
        .equals(assocId)
        .filter((a) => !a.deleted_at)
        .toArray();
      return rows.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
    },
    undefined as Ata[] | undefined,
    [assocId],
  );

  // Dispara sync 1x para puxar atas novas do servidor
  useEffect(() => {
    if (!assocId) return;
    syncManager.run(getDeviceId()).catch(() => {
      /* offline — Dexie já tem o que tem */
    });
  }, [assocId]);

  if (!associacaoAtiva) return <Navigate to="/solicitacoes" replace />;

  const loading = atas === undefined;
  const lista = atas ?? [];
  const filtradas = busca.trim()
    ? lista.filter((a) => {
        const t = busca.toLowerCase();
        return (
          a.titulo.toLowerCase().includes(t) ||
          a.conteudo.toLowerCase().includes(t) ||
          (a.local ?? "").toLowerCase().includes(t)
        );
      })
    : lista;

  return (
    <AppLayout navItems={memberNavItems} title="Atas">
      <div className="flex justify-center items-start pt-8 pb-12 px-6">
        <div className="max-w-3xl w-full flex flex-col gap-6">
          <header>
            <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f]">
              Atas das Assembleias
            </h1>
            <p className="text-[#414846] mt-2">
              Acompanhe o que foi discutido e decidido nas reuniões.
            </p>
          </header>

          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#414846]/60"
            />
            <Input
              placeholder="Buscar por título, conteúdo ou local..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading && (
            <div className="rounded-lg bg-white border border-[#c1c8c4]/30 p-8 text-center text-[#414846]">
              Carregando atas...
            </div>
          )}

          {!loading && filtradas.length === 0 && (
            <div className="rounded-lg bg-white border border-[#c1c8c4]/30 p-12 text-center">
              <BookOpen
                size={32}
                className="mx-auto mb-4 text-[#414846]/40"
              />
              <p className="text-[#414846]">
                {busca.trim()
                  ? "Nenhuma ata encontrada para sua busca."
                  : "Nenhuma ata registrada ainda."}
              </p>
            </div>
          )}

          {!loading && filtradas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtradas.map((ata) => (
                <article
                  key={ata.id}
                  className="rounded-xl bg-white border border-[#c1c8c4]/30 p-5 flex flex-col gap-3 hover:border-[#1A3C34]/40 hover:shadow-sm transition-all"
                >
                  <h3 className="font-headline font-bold text-[#01261f] line-clamp-2">
                    {ata.titulo}
                  </h3>

                  <p className="text-sm text-[#414846]/85 line-clamp-3">
                    {ata.conteudo}
                  </p>

                  <div className="space-y-1 text-xs text-[#414846]/70 mt-auto">
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

                  <div className="flex gap-2 pt-3 border-t border-[#f0ede8]">
                    <button
                      onClick={() => setResumoAta(ata)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#1A3C34] bg-[#1A3C34]/5 hover:bg-[#1A3C34]/10 transition-colors"
                    >
                      <Sparkles size={12} />
                      Resumo IA
                    </button>
                    <button
                      onClick={() => setVerAta(ata)}
                      className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-[#1A3C34] hover:bg-[#1A3C34]/5 transition-colors"
                    >
                      Ver completa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: ver ata completa */}
      <Dialog
        open={!!verAta}
        onOpenChange={(o) => !o && setVerAta(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>{verAta?.titulo}</DialogTitle>
            <DialogDescription>
              {verAta?.data && formatDateBR(verAta.data)}
              {verAta?.local && ` · ${verAta.local}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {verAta?.participantes && (
              <div>
                <p className="text-xs font-label uppercase tracking-wider text-[#414846] mb-1">
                  Participantes
                </p>
                <p className="text-sm text-[#1c1c19]">{verAta.participantes}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-label uppercase tracking-wider text-[#414846] mb-1">
                Conteúdo
              </p>
              <p className="text-sm text-[#1c1c19] whitespace-pre-wrap leading-relaxed">
                {verAta?.conteudo}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (verAta) {
                  setResumoAta(verAta);
                  setVerAta(null);
                }
              }}
            >
              <Sparkles size={14} className="mr-2" />
              Resumo IA
            </Button>
            <DialogClose render={<Button />}>Fechar</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: resumo IA */}
      <AtaResumoDialog
        ataId={resumoAta?.id ?? null}
        tituloAta={resumoAta?.titulo ?? null}
        open={!!resumoAta}
        onClose={() => setResumoAta(null)}
      />
    </AppLayout>
  );
}
