import { useAuthStore } from "@/store/auth.store";

export default function AppPlaceholder() {
  const perfil = useAuthStore((s) => s.perfil);
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Espoa</h1>
        <p className="text-muted-foreground">
          Olá, {perfil?.nome ?? "usuário"}!
        </p>
        {associacaoAtiva ? (
          <p className="text-sm">
            Associação ativa:{" "}
            <strong>{associacaoAtiva.associacaoNome}</strong> (
            {associacaoAtiva.role})
          </p>
        ) : (
          <p className="text-sm text-orange-500">
            Sem associação ativa — aguardando aprovação ou vincule-se a uma.
          </p>
        )}
      </div>
    </div>
  );
}
