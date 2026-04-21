import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Papel = "associado" | "adm" | null;

export default function OnboardingPage() {
  const [papel, setPapel] = useState<Papel>(null);
  const navigate = useNavigate();

  function selecionar(p: Papel) {
    setPapel(p);
    if (p === "associado") navigate("/onboarding/associado");
    if (p === "adm") navigate("/onboarding/adm");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Bem-vindo ao Espoa!</h1>
          <p className="text-muted-foreground text-lg">Como você vai usar o sistema?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer border-2 transition-colors hover:border-primary ${papel === "associado" ? "border-primary" : "border-border"}`}
            onClick={() => selecionar("associado")}
          >
            <CardHeader className="text-center pb-2">
              <div className="text-5xl mb-2">🧑‍🌾</div>
              <CardTitle className="text-xl">Sou Associado</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Quero me vincular a uma associação e acompanhar meus dados de produção e mensalidades.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer border-2 transition-colors hover:border-primary ${papel === "adm" ? "border-primary" : "border-border"}`}
            onClick={() => selecionar("adm")}
          >
            <CardHeader className="text-center pb-2">
              <div className="text-5xl mb-2">🏛️</div>
              <CardTitle className="text-xl">Sou Administrador</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Quero criar e gerenciar uma associação — membros, finanças, produção e PNAE.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Você pode estar vinculado a mais de uma associação com diferentes papéis.
        </p>
      </div>
    </div>
  );
}
