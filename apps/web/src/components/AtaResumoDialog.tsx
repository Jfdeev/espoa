import { useEffect, useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
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
import api from "@/lib/api";

interface AtaResumoDialogProps {
  ataId: string | null;
  tituloAta?: string | null;
  open: boolean;
  onClose: () => void;
}

export function AtaResumoDialog({
  ataId,
  tituloAta,
  open,
  onClose,
}: AtaResumoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!open || !ataId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setResumo(null);
      setErro(null);
      setCached(false);
      try {
        const { data } = await api.post<{ resumo: string; cached: boolean }>(
          `/atas/${ataId}/resumo`,
        );
        if (cancelled) return;
        setResumo(data.resumo);
        setCached(data.cached);
      } catch (err) {
        if (cancelled) return;
        const code = (err as { response?: { data?: { error?: string } } })
          ?.response?.data?.error;
        const msg =
          code === "ia_nao_configurada"
            ? "O resumo por IA ainda não está configurado neste ambiente."
            : code === "geracao_falhou"
            ? "Não foi possível gerar o resumo agora. Tente novamente em alguns minutos."
            : code === "acesso_negado_membro"
            ? "Você precisa ser membro ativo para ver o resumo desta ata."
            : "Erro ao buscar o resumo.";
        setErro(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, ataId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#1A3C34]" />
            Resumo simples
          </DialogTitle>
          <DialogDescription>
            {tituloAta
              ? `Resumo gerado por IA da ata "${tituloAta}".`
              : "Resumo gerado por IA."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[120px]">
          {loading && (
            <div className="flex items-center gap-3 text-sm text-[#414846] py-6">
              <Sparkles size={16} className="animate-pulse text-[#1A3C34]" />
              {cached
                ? "Carregando resumo..."
                : "Gerando resumo com IA (pode levar alguns segundos)..."}
            </div>
          )}

          {erro && !loading && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {resumo && !loading && (
            <div className="space-y-3">
              <div className="prose prose-sm max-w-none text-[#1c1c19] whitespace-pre-wrap">
                {resumo}
              </div>
              {cached && (
                <p className="text-xs text-[#414846]/70 italic">
                  Resumo já gerado anteriormente — em cache.
                </p>
              )}
              <p className="text-xs text-[#414846]/60 border-t border-[#c1c8c4]/30 pt-2">
                Este é um resumo automático em linguagem simples. Para detalhes
                exatos, consulte a ata completa.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Fechar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
