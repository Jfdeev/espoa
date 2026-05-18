import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Leaf, WifiOff, Trash2, Sprout, Scale, CalendarDays, User, Plus, ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnlineStatus } from "@/lib/network";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { producaoRepository } from "@/repositories/producao.repository";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";
import { useAuthStore } from "@/store/auth.store";
import { db } from "@/database/db";
import type { Associado } from "@/database/types";
import AppLayout from "./AppLayout";
import { adminNavItems, memberNavItems } from "./nav-items";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerInput } from "@/components/ui/date-picker";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CULTURAS_SUGERIDAS = [
  "Cacau", "Mel", "Pimenta-do-reino", "Mandioca",
];

const formVazio = {
  associado_id: "",
  cultura: "",
  quantidade: "",
  data: new Date().toISOString().slice(0, 10),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatQuantidade(qtd: number) {
  return qtd.toLocaleString("pt-BR") + " kg";
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ColheitasPage() {
  const online = useOnlineStatus();
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const perfil = useAuthStore((s) => s.perfil);
  const isAdmin = associacaoAtiva?.role === "adm";

  const location = useLocation();
  const openForm = (location.state as { openForm?: boolean } | null)?.openForm === true;
  const [view, setView] = useState<"lista" | "form">(openForm ? "form" : "lista");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(formVazio);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const producoes = useLiveQuery(async () => {
    if (!associacaoAtiva) return [];
    const ids = await db.associado
      .where("associacao_id").equals(associacaoAtiva.associacaoId)
      .filter((a) => !a.deleted_at)
      .primaryKeys() as string[];
    return db.producao.filter((p) => !p.deleted_at && ids.includes(p.associado_id)).toArray();
  }, undefined, [associacaoAtiva?.associacaoId]);

  const associados = useLiveQuery<Associado[] | undefined>(
    () => associacaoAtiva
      ? db.associado.where("associacao_id").equals(associacaoAtiva.associacaoId).filter((a) => !a.deleted_at).toArray()
      : Promise.resolve([] as Associado[]),
    undefined,
    [associacaoAtiva?.associacaoId],
  );

  // Para o associado: encontra o próprio registro via usuario_id
  // null = ainda carregando; undefined = carregou e não encontrou; objeto = encontrou
  const associadoSelf = useLiveQuery<Associado | undefined | null>(
    () => perfil
      ? db.associado.filter((a) => a.usuario_id === perfil.id && !a.deleted_at).first()
      : Promise.resolve(null),
    null,
    [perfil?.id],
  );

  function nomeAssociado(id: string) {
    return associados?.find((a) => a.id === id)?.nome ?? "—";
  }

  function handleEditar(p: { id?: string; associado_id: string; cultura: string; quantidade: number; data: string }) {
    setEditandoId(p.id!);
    setForm({
      associado_id: p.associado_id,
      cultura: p.cultura,
      quantidade: String(p.quantidade),
      data: p.data,
    });
    setView("form");
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();

    const quantidade = Number.parseFloat(form.quantidade);

    if (!isAdmin && !associadoSelf?.id) {
      toast.error("Seu cadastro de associado não foi encontrado. Fale com o administrador.");
      return;
    }
    if (isAdmin && !form.associado_id) {
      toast.error("Escolha o responsável pela colheita.");
      return;
    }
    if (!form.cultura.trim()) {
      toast.error("Informe o nome da cultura colhida.");
      return;
    }
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      toast.error("A quantidade precisa ser um número maior que zero.");
      return;
    }
    if (!form.data) {
      toast.error("Informe a data da colheita.");
      return;
    }

    setSalvando(true);
    try {
      const associadoId = isAdmin ? form.associado_id : (associadoSelf?.id ?? "");

      if (editandoId) {
        await producaoRepository.update(editandoId, {
          associado_id: associadoId,
          cultura: form.cultura.trim(),
          quantidade,
          data: form.data,
        });
      } else {
        await producaoRepository.create({
          associado_id: associadoId,
          cultura: form.cultura.trim(),
          quantidade,
          data: form.data,
        });
      }

      if (online) {
        syncManager.run(getDeviceId()).catch(() => {});
      }

      const wasEditing = !!editandoId;
      setForm(formVazio);
      setEditandoId(null);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setView("lista");
        toast.success(
          online
            ? wasEditing ? "Colheita atualizada com sucesso!" : "Colheita registrada com sucesso!"
            : "Salvo no dispositivo. Será enviado quando você reconectar.",
        );
      }, 2000);
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id: string) {
    setExcluindoId(id);
    try {
      await producaoRepository.delete(id);
      toast.success(
        online
          ? "Registro removido."
          : "Registro removido. Será sincronizado quando você reconectar.",
      );
      if (online) {
        syncManager.run(getDeviceId()).catch(() => {});
      }
    } catch {
      toast.error("Não foi possível remover. Tente novamente.");
    } finally {
      setExcluindoId(null);
    }
  }

  const navItems = isAdmin ? adminNavItems : memberNavItems;
  // Controla o carregamento da LISTA (precisa de producoes e associados)
  const carregando = producoes === undefined || associados === undefined;
  // Controla o carregamento do FORMULÁRIO (também precisa do próprio associado, para não-admins)
  // associadoSelf === null significa ainda carregando; undefined significa carregou mas não encontrou (permite clicar e ver o toast de erro)
  const formCarregando = carregando || (!isAdmin && associadoSelf === null);

  return (
    <AppLayout navItems={navItems} title="Colheitas">
      <Toaster />
      <div className="p-6 lg:p-12 max-w-4xl mx-auto space-y-10">

        {/* Banner offline — aparece em ambas as views */}
        {!online && (
          <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-[#fff3e0] border border-[#E67E22]/30 text-sm text-[#9a4f00]">
            <WifiOff size={18} className="shrink-0 mt-0.5" />
            <span>
              <strong>Sem internet no momento.</strong> Você pode continuar registrando normalmente.
              Os dados ficam guardados aqui no celular e são enviados automaticamente quando a internet voltar.
            </span>
          </div>
        )}

        {/* ── VIEW: LISTA ─────────────────────────────────────────────────────── */}
        {view === "lista" && (
          <>
            {/* Cabeçalho com botão */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f] mb-1">
                  Colheitas
                </h1>
                <p className="text-[#414846]">
                  Veja aqui tudo que foi colhido na propriedade.
                </p>
              </div>
              <button
                onClick={() => { setForm(formVazio); setView("form"); }}
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#01261f] text-white text-sm font-medium hover:bg-[#1a3c34] transition-colors shrink-0"
              >
                <Plus size={16} />
                Colheita
              </button>
            </div>

            {/* Lista */}
            {carregando ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-[#f6f3ee] animate-pulse" />
                ))}
              </div>
            ) : producoes?.length === 0 ? (
              <div className="bg-[#f6f3ee] rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Leaf size={26} className="text-[#01261f]/40" />
                </div>
                <div>
                  <p className="font-medium text-[#1c1c19]">Nenhuma colheita registrada ainda</p>
                  <p className="text-sm text-[#414846]/70 mt-1">
                    Clique em "Nova Colheita" para registrar a primeira.
                  </p>
                </div>
                <button
                  onClick={() => { setForm(formVazio); setView("form"); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#01261f] text-white text-sm font-medium hover:bg-[#1a3c34] transition-colors"
                >
                  <Plus size={16} />
                  Colheita
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {producoes?.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#f6f3ee] flex items-center justify-center shrink-0">
                      <Leaf size={20} className="text-[#01261f]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#01261f] text-base leading-tight">
                        {p.cultura}
                      </p>
                      <p className="text-sm text-[#414846] mt-0.5">
                        {nomeAssociado(p.associado_id)}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs text-[#1a3c34] bg-[#1a3c34]/10 px-2 py-0.5 rounded-full font-medium">
                          <Scale size={11} />
                          {formatQuantidade(p.quantidade)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-[#414846]">
                          <CalendarDays size={11} />
                          {formatDate(p.data)}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditar(p)}
                          className="flex items-center justify-center w-10 h-10 rounded-full text-[#414846]/40 hover:text-[#01261f] hover:bg-[#f0ede8] transition-colors"
                          aria-label="Editar colheita"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmandoId(p.id!)}
                          disabled={excluindoId === p.id}
                          className="flex items-center justify-center w-10 h-10 rounded-full text-[#414846]/40 hover:text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors disabled:opacity-40"
                          aria-label="Remover colheita"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── VIEW: FORMULÁRIO ────────────────────────────────────────────────── */}
        {view === "form" && (
          <>
            {/* Cabeçalho com botão voltar */}
            <div>
              <button
                onClick={() => { setForm(formVazio); setEditandoId(null); setView("lista"); }}
                className="flex items-center gap-2 text-sm text-[#414846] hover:text-[#01261f] transition-colors mb-6"
              >
                <ArrowLeft size={16} />
                Voltar para colheitas
              </button>
              <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f] mb-1">
                {editandoId ? "Editar Colheita" : "Nova Colheita"}
              </h1>
              <p className="text-[#414846]">Preencha os campos abaixo e clique em Salvar.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#01261f] flex items-center justify-center text-white shrink-0">
                  <Sprout size={22} />
                </div>
                <div>
                  <h2 className="font-headline text-lg font-bold text-[#01261f]">
                    {editandoId ? "Alterar dados da colheita" : "Registrar Colheita"}
                  </h2>
                  <p className="text-sm text-[#414846]">Todos os campos com * são obrigatórios.</p>
                </div>
              </div>

              <form onSubmit={handleSalvar} noValidate className="space-y-5">
                {/* Responsável pela colheita */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-[#01261f] font-medium text-sm">
                    <User size={15} />
                    Quem fez a colheita? <span className="text-red-500">*</span>
                  </Label>
                  {isAdmin ? (
                    // Admin: select com ele mesmo + todos os associados
                    formCarregando ? (
                      <div className="h-11 rounded-lg bg-[#f6f3ee] animate-pulse" />
                    ) : (
                      <Select
                        value={form.associado_id}
                        onValueChange={(val) => setForm((prev) => ({ ...prev, associado_id: val ?? "" }))}
                      >
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder="Selecione o responsável...">
                            {form.associado_id && associados
                              ? (() => {
                                  const a = associados.find((x) => x.id === form.associado_id);
                                  return a ? `${a.nome}${a.usuario_id === perfil?.id ? " (você)" : ""}` : form.associado_id;
                                })()
                              : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {associados?.map((a) => (
                            <SelectItem key={a.id} value={a.id ?? ""}>
                              {a.nome}{a.usuario_id === perfil?.id ? " (você)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  ) : (
                    // Associado: nome pré-preenchido, somente leitura
                    <div className="h-11 w-full rounded-lg border border-input bg-[#f6f3ee] px-3 py-2 text-sm flex items-center text-[#1c1c19]">
                      {perfil?.nome ?? "—"}
                    </div>
                  )}
                </div>

                {/* Cultura */}
                <div className="space-y-2">
                  <Label htmlFor="cultura" className="flex items-center gap-2 text-[#01261f] font-medium text-sm">
                    <Leaf size={15} />
                    O que foi colhido? <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.cultura}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, cultura: val ?? "" }))}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Selecione a cultura..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CULTURAS_SUGERIDAS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantidade e Data */}
                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="quantidade" className="flex items-center gap-2 text-[#01261f] font-medium text-sm">
                      <Scale size={15} />
                      Quantidade colhida (kg) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="quantidade"
                      name="quantidade"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Ex: 500"
                      value={form.quantidade}
                      onChange={handleChange}
                      className="h-11"
                    />
                    <p className="text-xs text-[#414846]/70">Informe em quilogramas (kg).</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data" className="flex items-center gap-2 text-[#01261f] font-medium text-sm">
                      <CalendarDays size={15} />
                      Data da colheita <span className="text-red-500">*</span>
                    </Label>
                    <DatePickerInput
                      value={form.data}
                      onChange={(v) => setForm((prev) => ({ ...prev, data: v }))}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={salvando || formCarregando}
                    className="w-full sm:w-auto bg-[#01261f] hover:bg-[#1a3c34] text-white h-11 px-8 rounded-xl font-medium text-base"
                  >
                    {salvando ? "Salvando..." : editandoId ? "Salvar Alterações" : "Salvar Colheita"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setForm(formVazio); setEditandoId(null); setView("lista"); }}
                    className="text-sm text-[#414846] hover:text-[#01261f] transition-colors text-center"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

      </div>

      {/* FAB mobile — visível apenas na lista em telas pequenas */}
      {view === "lista" && (
        <button
          onClick={() => { setForm(formVazio); setView("form"); }}
          className="sm:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-[#01261f] text-white text-base font-semibold shadow-lg hover:bg-[#1a3c34] active:scale-95 transition-all"
        >
          <Plus size={20} />
          Colheita
        </button>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[#16a34a] text-white animate-in fade-in duration-300">
          <p className="font-headline text-5xl font-bold tracking-tight">pronto!</p>
          <div className="w-28 h-28 rounded-full bg-white/15 flex items-center justify-center">
            <Sprout size={64} strokeWidth={1.5} />
          </div>
          <p className="font-headline text-2xl font-bold text-center leading-snug">
            sua colheita foi<br />registrada
          </p>
        </div>
      )}

      <Dialog
        open={!!confirmandoId}
        onOpenChange={(open) => { if (!open) setConfirmandoId(null); }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Excluir colheita?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmandoId(null)}
              className="h-10 px-5 rounded-xl border border-input text-sm font-medium hover:bg-[#f6f3ee] transition-colors"
            >
              Não
            </button>
            <button
              onClick={() => {
                const id = confirmandoId!;
                setConfirmandoId(null);
                handleExcluir(id);
              }}
              disabled={!!excluindoId}
              className="h-10 px-5 rounded-xl bg-[#ba1a1a] text-white text-sm font-medium hover:bg-[#9b1515] transition-colors disabled:opacity-50"
            >
              Sim, excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
