import nodemailer from "nodemailer";

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;

  if (cachedTransport) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransport;
}

/**
 * Envia um email de notificação. Fire-and-forget — nunca lança erro;
 * loga falhas no console e segue em frente. Não bloqueia o fluxo do caller.
 *
 * Se as variáveis EMAIL_USER/EMAIL_PASS não estiverem configuradas, a chamada
 * vira no-op com um aviso silencioso (ambiente de dev sem SMTP).
 */
export function sendNotificationEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): void {
  const transport = getTransport();
  if (!transport) {
    console.warn("[email] EMAIL_USER/EMAIL_PASS não configurados — pulando envio");
    return;
  }

  // Não aguardamos a promise — fire and forget
  transport
    .sendMail({
      from: process.env.EMAIL_USER,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text ?? stripHtml(params.html),
    })
    .catch((err) => {
      console.error("[email] falha ao enviar para", params.to, "-", err?.message ?? err);
    });
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Templates simples para os principais eventos de notificação.
 * Mantidos inline para evitar criar diretório de templates antes de termos volume.
 */
export const emailTemplates = {
  vinculoAprovado(params: { nomeMembro: string; nomeAssociacao: string }) {
    return {
      subject: `Seu vínculo com ${params.nomeAssociacao} foi aprovado`,
      html: `
        <p>Olá, ${escapeHtml(params.nomeMembro)}!</p>
        <p>Seu pedido de vínculo com a associação <strong>${escapeHtml(
          params.nomeAssociacao,
        )}</strong> foi aprovado.</p>
        <p>Agora você pode acessar o app e participar da associação.</p>
        <p>— Equipe Espoá</p>
      `,
    };
  },
  vinculoRejeitado(params: { nomeMembro: string; nomeAssociacao: string }) {
    return {
      subject: `Sobre seu vínculo com ${params.nomeAssociacao}`,
      html: `
        <p>Olá, ${escapeHtml(params.nomeMembro)}.</p>
        <p>Infelizmente seu pedido de vínculo com a associação <strong>${escapeHtml(
          params.nomeAssociacao,
        )}</strong> não foi aprovado neste momento.</p>
        <p>Se tiver dúvidas, entre em contato com o administrador da associação.</p>
        <p>— Equipe Espoá</p>
      `,
    };
  },
  novaAta(params: {
    nomeMembro: string;
    nomeAssociacao: string;
    tituloAta: string;
    dataAta: string;
  }) {
    return {
      subject: `Nova ata publicada: ${params.tituloAta}`,
      html: `
        <p>Olá, ${escapeHtml(params.nomeMembro)}!</p>
        <p>Uma nova ata foi registrada na associação <strong>${escapeHtml(
          params.nomeAssociacao,
        )}</strong>:</p>
        <ul>
          <li><strong>Título:</strong> ${escapeHtml(params.tituloAta)}</li>
          <li><strong>Data:</strong> ${escapeHtml(params.dataAta)}</li>
        </ul>
        <p>Acesse o app para ler a ata completa.</p>
        <p>— Equipe Espoá</p>
      `,
    };
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
