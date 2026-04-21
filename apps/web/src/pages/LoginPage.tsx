import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

type Modo = "login" | "cadastro" | "recuperar";

export default function LoginPage() {
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const setPerfil = useAuthStore((s) => s.setPerfil);

  async function sincronizarUsuario(provider: "google" | "email", nomeOverride?: string) {
    const { data } = await api.post("/auth/sync-user", {
      nome: nomeOverride ?? email.split("@")[0],
      authProvider: provider,
      avatarUrl: auth.currentUser?.photoURL ?? undefined,
    });
    const me = await api.get("/auth/me");
    setPerfil(me.data.usuario, me.data.vinculos);
    return me.data.vinculos;
  }

  async function handleLoginEmail(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      const vinculos = await sincronizarUsuario("email");
      navigate(vinculos.length > 0 ? "/app" : "/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer login";
      toast.error(msg);
    } finally {
      setCarregando(false);
    }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      await createUserWithEmailAndPassword(auth, email, senha);
      const vinculos = await sincronizarUsuario("email", nome);
      navigate(vinculos.length > 0 ? "/app" : "/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar conta";
      toast.error(msg);
    } finally {
      setCarregando(false);
    }
  }

  async function handleGoogle() {
    setCarregando(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      const vinculos = await sincronizarUsuario("google", auth.currentUser?.displayName ?? undefined);
      navigate(vinculos.length > 0 ? "/app" : "/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar com Google";
      toast.error(msg);
    } finally {
      setCarregando(false);
    }
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Email de recuperação enviado!");
      setModo("login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar email";
      toast.error(msg);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Toaster />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Espoa</CardTitle>
          <CardDescription>
            {modo === "login" && "Entre na sua conta"}
            {modo === "cadastro" && "Crie sua conta"}
            {modo === "recuperar" && "Recuperar senha"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modo !== "recuperar" && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={carregando}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Entrar com Google
            </Button>
          )}

          {modo !== "recuperar" && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>
          )}

          <form
            onSubmit={
              modo === "login"
                ? handleLoginEmail
                : modo === "cadastro"
                  ? handleCadastro
                  : handleRecuperar
            }
            className="space-y-3"
          >
            {modo === "cadastro" && (
              <div className="space-y-1">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            {modo !== "recuperar" && (
              <div className="space-y-1">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando
                ? "Aguarde..."
                : modo === "login"
                  ? "Entrar"
                  : modo === "cadastro"
                    ? "Criar conta"
                    : "Enviar email de recuperação"}
            </Button>
          </form>

          <div className="text-center text-sm space-y-1">
            {modo === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => setModo("recuperar")}
                  className="text-muted-foreground hover:underline block w-full"
                >
                  Esqueci minha senha
                </button>
                <button
                  type="button"
                  onClick={() => setModo("cadastro")}
                  className="text-primary hover:underline block w-full"
                >
                  Não tem conta? Cadastre-se
                </button>
              </>
            )}
            {(modo === "cadastro" || modo === "recuperar") && (
              <button
                type="button"
                onClick={() => setModo("login")}
                className="text-primary hover:underline"
              >
                Voltar para o login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
