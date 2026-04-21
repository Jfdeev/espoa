import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

interface AssocacaoBusca {
  id: string;
  nome: string;
  municipio: string;
  estado: string;
}

export default function OnboardingAssociadoPage() {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<AssocacaoBusca[]>([]);
  const [selecionada, setSelecionada] = useState<AssocacaoBusca | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const navigate = useNavigate();
  const vinculos = useAuthStore((s) => s.vinculos);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.get<AssocacaoBusca[]>(`/associacoes?q=${busca}`);
        setOpcoes(data);
      } catch {
        // silencioso
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [busca]);

  async function solicitar() {
    if (!selecionada) return;
    setEnviando(true);
    try {
      await api.post(`/associacoes/${selecionada.id}/solicitar-vinculo`);
      setSucesso(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao solicitar vínculo";
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="text-5xl mb-2">✅</div>
            <CardTitle>Solicitação enviada!</CardTitle>
            <CardDescription>
              Sua solicitação foi enviada para{" "}
              <strong>{selecionada?.nome}</strong>. Você será notificado quando
              o administrador aprovar seu acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Enquanto isso, você já pode explorar o app com acesso limitado.
            </p>
            <Button onClick={() => navigate("/app")} className="w-full">
              Ir para o app
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vinculosAtivos = vinculos.filter((v) => v.status === "ativo");

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Toaster />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Encontrar minha associação</CardTitle>
          <CardDescription>
            Busque pelo nome da sua associação ou município e solicite o vínculo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selecionada
                  ? `${selecionada.nome} — ${selecionada.municipio}/${selecionada.estado}`
                  : "Buscar associação..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput
                  placeholder="Nome ou município..."
                  value={busca}
                  onValueChange={setBusca}
                />
                <CommandList>
                  <CommandEmpty>Nenhuma associação encontrada.</CommandEmpty>
                  <CommandGroup>
                    {opcoes.map((a) => (
                      <CommandItem
                        key={a.id}
                        value={a.id}
                        onSelect={() => {
                          setSelecionada(a);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selecionada?.id === a.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div>
                          <p className="font-medium">{a.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.municipio} / {a.estado}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selecionada && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="font-medium">{selecionada.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {selecionada.municipio} — {selecionada.estado}
                </p>
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full"
            disabled={!selecionada || enviando}
            onClick={solicitar}
          >
            {enviando ? "Enviando..." : "Solicitar vínculo"}
          </Button>

          {vinculosAtivos.length > 0 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/app")}
            >
              Ir para o app (já tenho vínculo ativo)
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => navigate("/onboarding")}
          >
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
