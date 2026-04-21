import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function formatarCNPJ(v: string) {
  return v
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

const schema = z.object({
  nome: z.string().min(3, "Nome muito curto"),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido"),
  municipio: z.string().min(2, "Informe o município"),
  estado: z.string().length(2, "Selecione um estado"),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function OnboardingADMPage() {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const setPerfil = useAuthStore((s) => s.setPerfil);
  const perfil = useAuthStore((s) => s.perfil);

  async function onSubmit(data: FormData) {
    setEnviando(true);
    try {
      await api.post("/associacoes", data);
      const me = await api.get("/auth/me");
      if (perfil) setPerfil(me.data.usuario, me.data.vinculos);
      navigate("/app");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar associação";
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  }

  const cnpjValue = watch("cnpj") ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Toaster />
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Criar minha associação</CardTitle>
          <CardDescription>
            Preencha os dados da sua associação. Você será o administrador responsável.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome da associação *</Label>
              <Input
                id="nome"
                {...register("nome")}
                placeholder="Associação dos Produtores de..."
              />
              {errors.nome && (
                <p className="text-xs text-destructive">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={cnpjValue}
                onChange={(e) => setValue("cnpj", formatarCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
              {errors.cnpj && (
                <p className="text-xs text-destructive">{errors.cnpj.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="municipio">Município *</Label>
                <Input
                  id="municipio"
                  {...register("municipio")}
                  placeholder="Ex: Petrolina"
                />
                {errors.municipio && (
                  <p className="text-xs text-destructive">{errors.municipio.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Estado *</Label>
                <Select onValueChange={(v) => setValue("estado", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.estado && (
                  <p className="text-xs text-destructive">{errors.estado.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="telefone">Telefone de contato</Label>
              <Input
                id="telefone"
                {...register("telefone")}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="emailAssoc">Email institucional</Label>
              <Input
                id="emailAssoc"
                type="email"
                {...register("email")}
                placeholder="associacao@email.com"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/onboarding")}
              >
                Voltar
              </Button>
              <Button type="submit" className="flex-1" disabled={enviando}>
                {enviando ? "Criando..." : "Criar associação"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
