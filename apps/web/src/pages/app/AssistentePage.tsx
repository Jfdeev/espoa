import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Send, Sparkles, MessageSquare, AlertCircle } from "lucide-react";
import AppLayout from "./AppLayout";
import { adminNavItems, memberNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import {
  askAssistente,
  type ChatMessage,
} from "@/lib/assistente-api";

const SUGESTOES = [
  "Minha mensalidade está paga?",
  "O que ficou decidido na última ata?",
  "Como funciona o PNAE?",
  "Quais são os avisos da associação?",
];

interface DisplayMessage extends ChatMessage {
  id: string;
  pending?: boolean;
  error?: boolean;
}

function makeMessage(role: ChatMessage["role"], content: string): DisplayMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  };
}

export default function AssistentePage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const perfil = useAuthStore((s) => s.perfil);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Early return DEPOIS de todos os hooks (evita "rendered fewer hooks than expected")
  if (!associacaoAtiva) return <Navigate to="/solicitacoes" replace />;

  const navItems =
    associacaoAtiva.role === "adm" ? adminNavItems : memberNavItems;
  const primeiroNome = perfil?.nome?.split(" ")[0] ?? "você";

  const enviar = async (texto: string) => {
    const trimmed = texto.trim();
    if (!trimmed || enviando) return;

    setErroGlobal(null);
    const userMsg = makeMessage("user", trimmed);
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setEnviando(true);

    // Histórico para a API: apenas mensagens completas (sem erros/pending)
    const history = messages
      .filter((m) => !m.pending && !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const { reply } = await askAssistente({
        associacaoId: associacaoAtiva.associacaoId,
        message: trimmed,
        history,
      });
      setMessages((prev) => [...prev, makeMessage("assistant", reply)]);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      const msg =
        code === "ia_nao_configurada"
          ? "O assistente ainda não está configurado neste ambiente."
          : code === "mensagem_muito_longa"
            ? "Sua mensagem é muito longa. Tente algo mais curto."
            : code === "geracao_falhou"
              ? "Não consegui gerar uma resposta agora. Tente novamente."
              : code === "acesso_negado_membro"
                ? "Você precisa ser membro ativo para usar o assistente."
                : "Algo deu errado. Tente novamente.";
      setMessages((prev) => [
        ...prev,
        { ...makeMessage("assistant", msg), error: true },
      ]);
      if (code === "ia_nao_configurada") setErroGlobal(msg);
    } finally {
      setEnviando(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    enviar(input);
  };

  return (
    <AppLayout navItems={navItems} title="Assistente">
      <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen lg:max-h-screen">
        {/* Cabeçalho */}
        <header className="px-6 py-4 border-b border-[#c1c8c4]/30 bg-white flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#1A3C34] flex items-center justify-center text-white">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="font-headline text-lg font-bold text-[#01261f]">
              Assistente Espoá
            </h1>
            <p className="text-xs text-[#414846]">
              Tire dúvidas sobre sua mensalidade, atas, avisos e PNAE.
            </p>
          </div>
        </header>

        {/* Mensagens */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
        >
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.length === 0 && !erroGlobal && (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-[#1A3C34]/5 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={24} className="text-[#1A3C34]" />
                </div>
                <h2 className="font-headline font-bold text-[#01261f] mb-2">
                  Oi, {primeiroNome}! Como posso ajudar?
                </h2>
                <p className="text-sm text-[#414846] mb-6">
                  Perguntas que costumam funcionar bem:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => enviar(s)}
                      disabled={enviando}
                      className="text-left text-sm px-3 py-2 rounded-lg bg-white border border-[#c1c8c4]/30 hover:bg-[#fcf9f4] disabled:opacity-50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {erroGlobal && messages.length === 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{erroGlobal}</span>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {enviando && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#c1c8c4]/30 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-[#414846]">
                  <Sparkles size={14} className="animate-pulse text-[#1A3C34]" />
                  Pensando...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-[#c1c8c4]/30 bg-white px-4 sm:px-6 py-4 flex-shrink-0"
        >
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva sua pergunta..."
              disabled={enviando}
              maxLength={1000}
              className="flex-1 rounded-full border border-[#c1c8c4]/40 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A3C34]/30 disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={enviando || !input.trim()}
              className="rounded-full px-5"
            >
              <Send size={16} />
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-[#1A3C34] text-white"
            : message.error
              ? "bg-amber-50 border border-amber-200 text-amber-900"
              : "bg-white border border-[#c1c8c4]/30 text-[#1c1c19]"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
