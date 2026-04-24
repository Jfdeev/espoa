import { db, usuario, associacao, usuarioAssociacao } from "@espoa/database";
import { and, eq, ilike, or } from "drizzle-orm";
import bcryptjs from "bcryptjs";
import { randomBytes } from "node:crypto";
import { signToken } from "../lib/jwt";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import type { Request, Response } from "express";


// ─── Helpers ────────────────────────────────────────────────────────────────

function getUserByEmail(email: string) {
  return db.select().from(usuario).where(eq(usuario.email, email)).limit(1);
}

function getUserById(id: string) {
  return db.select().from(usuario).where(eq(usuario.id, id)).limit(1);
}

// ─── Register ────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response) {
  const { nome, email, password } = req.body as {
    nome: string;
    email: string;
    password: string;
  };

  if (!nome || !email || !password) {
    res.status(400).json({ error: "nome, email e password são obrigatórios" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres" });
    return;
  }

  const existing = await getUserByEmail(email.toLowerCase().trim());
  if (existing.length > 0) {
    res.status(409).json({ error: "E-mail já cadastrado" });
    return;
  }

  const passwordHash = await bcryptjs.hash(password, 12);
  const verificationToken = randomBytes(32).toString("hex");

  const [created] = await db
    .insert(usuario)
    .values({
      nome,
      email: email.toLowerCase().trim(),
      passwordHash,
      authProvider: "email",
      emailVerified: false,
      verificationToken,
    })
    .returning();

  // PENDING: enviar e-mail de verificação com verificationToken
  // await sendVerificationEmail(created.email, verificationToken);

  const token = signToken({ sub: created.id, email: created.email });
  res.status(201).json({ token, usuario: sanitize(created) });
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: "email e password são obrigatórios" });
    return;
  }

  const [user] = await getUserByEmail(email.toLowerCase().trim());
  if (!user?.passwordHash) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const valid = await bcryptjs.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const token = signToken({ sub: user.id, email: user.email });
  res.json({ token, usuario: sanitize(user) });
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function googleAuth(req: Request, res: Response) {
  const { idToken } = req.body as { idToken: string };

  if (!idToken) {
    res.status(400).json({ error: "idToken é obrigatório" });
    return;
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    res.status(503).json({ error: "Google OAuth não configurado" });
    return;
  }

  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
    );
    if (!response.ok) {
      res.status(401).json({ error: "Token Google inválido" });
      return;
    }

    const googlePayload = await response.json() as {
      sub: string;
      email: string;
      name: string;
      picture: string;
      aud: string;
    };

    if (googlePayload.aud !== googleClientId) {
      res.status(401).json({ error: "Token não pertence a este app" });
      return;
    }

    const { sub: googleId, email, name, picture } = googlePayload;

    let [user] = await db
      .select()
      .from(usuario)
      .where(eq(usuario.googleId, googleId))
      .limit(1);

    if (!user) {
      const byEmail = await getUserByEmail(email);
      if (byEmail.length > 0) {
        [user] = await db
          .update(usuario)
          .set({ googleId, avatarUrl: picture, emailVerified: true })
          .where(eq(usuario.id, byEmail[0].id))
          .returning();
      } else {
        const [created] = await db
          .insert(usuario)
          .values({
            nome: name,
            email: email.toLowerCase(),
            googleId,
            authProvider: "google",
            avatarUrl: picture,
            emailVerified: true,
          })
          .returning();
        user = created;
      }
    }

    const token = signToken({ sub: user.id, email: user.email });
    res.json({ token, usuario: sanitize(user) });
  } catch {
    res.status(401).json({ error: "Falha ao verificar token Google" });
  }
}

// ─── Forgot Password ─────────────────────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as { email: string };

  if (!email) {
    res.status(400).json({ error: "email é obrigatório" });
    return;
  }

  const [user] = await getUserByEmail(email.toLowerCase().trim());
  // Responder sempre 200 para não revelar se o e-mail existe
  if (!user) {
    res.json({ message: "Se o e-mail estiver cadastrado, você receberá as instruções" });
    return;
  }

  const resetToken = randomBytes(32).toString("hex");
  const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await db
    .update(usuario)
    .set({ resetToken, resetTokenExpiresAt })
    .where(eq(usuario.id, user.id));

  // PENDING: await sendPasswordResetEmail(user.email, resetToken);

  res.json({ message: "Se o e-mail estiver cadastrado, você receberá as instruções" });
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body as { token: string; password: string };

  if (!token || !password) {
    res.status(400).json({ error: "token e password são obrigatórios" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres" });
    return;
  }

  const [user] = await db
    .select()
    .from(usuario)
    .where(eq(usuario.resetToken, token))
    .limit(1);

  if (!user?.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    res.status(400).json({ error: "Token inválido ou expirado" });
    return;
  }

  const passwordHash = await bcryptjs.hash(password, 12);

  await db
    .update(usuario)
    .set({ passwordHash, resetToken: null, resetTokenExpiresAt: null })
    .where(eq(usuario.id, user.id));

  res.json({ message: "Senha redefinida com sucesso" });
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.query as { token: string };

  if (!token) {
    res.status(400).json({ error: "token é obrigatório" });
    return;
  }

  const [user] = await db
    .select()
    .from(usuario)
    .where(eq(usuario.verificationToken, token))
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "Token inválido" });
    return;
  }

  await db
    .update(usuario)
    .set({ emailVerified: true, verificationToken: null })
    .where(eq(usuario.id, user.id));

  res.json({ message: "E-mail verificado com sucesso" });
}

// ─── Me ───────────────────────────────────────────────────────────────────────

export async function getMe(req: AuthenticatedRequest, res: Response) {
  const [me] = await getUserById(req.userId!);

  if (!me) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const vinculos = await db
    .select({
      associacaoId: usuarioAssociacao.associacaoId,
      role: usuarioAssociacao.role,
      status: usuarioAssociacao.status,
      joinedAt: usuarioAssociacao.joinedAt,
      associacaoNome: associacao.nome,
      associacaoMunicipio: associacao.municipio,
      associacaoEstado: associacao.estado,
    })
    .from(usuarioAssociacao)
    .innerJoin(associacao, eq(usuarioAssociacao.associacaoId, associacao.id))
    .where(eq(usuarioAssociacao.usuarioId, me.id));

  res.json({ usuario: sanitize(me), vinculos });
}

// ─── Associações ─────────────────────────────────────────────────────────────

export async function listarAssociacoes(req: AuthenticatedRequest, res: Response) {
  const q = (req.query.q as string) ?? "";

  const rows = await db
    .select({
      id: associacao.id,
      nome: associacao.nome,
      municipio: associacao.municipio,
      estado: associacao.estado,
    })
    .from(associacao)
    .where(
      q.trim().length >= 2
        ? or(
            ilike(associacao.nome, `%${q}%`),
            ilike(associacao.municipio, `%${q}%`),
          )
        : undefined,
    )
    .limit(30);

  res.json(rows);
}

export async function criarAssociacao(req: AuthenticatedRequest, res: Response) {
  const { nome, cnpj, municipio, estado, telefone, email } = req.body as {
    nome: string;
    cnpj: string;
    municipio: string;
    estado: string;
    telefone?: string;
    email?: string;
  };

  if (!nome || !cnpj || !municipio || !estado) {
    res.status(400).json({ error: "nome, cnpj, municipio e estado são obrigatórios" });
    return;
  }

  const [me] = await getUserById(req.userId!);
  if (!me) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const [novaAssociacao] = await db
    .insert(associacao)
    .values({ nome, cnpj, municipio, estado, telefone, email, createdBy: me.id })
    .returning();

  await db.insert(usuarioAssociacao).values({
    usuarioId: me.id,
    associacaoId: novaAssociacao.id,
    role: "adm",
    status: "ativo",
    joinedAt: new Date(),
  });

  res.status(201).json({ associacao: novaAssociacao });
}

export async function solicitarVinculo(req: AuthenticatedRequest, res: Response) {
  const { id: associacaoId } = req.params as { id: string };
  const { role } = req.body as { role?: string };
  const papel = role === "adm" ? "adm" : "associado";

  const [me] = await getUserById(req.userId!);
  if (!me) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const existente = await db
    .select()
    .from(usuarioAssociacao)
    .where(eq(usuarioAssociacao.usuarioId, me.id))
    .limit(1);

  const jaVinculado = existente.find((v) => v.associacaoId === associacaoId);
  if (jaVinculado) {
    res.status(409).json({ error: "Vínculo já existe", status: jaVinculado.status });
    return;
  }

  const [vinculo] = await db
    .insert(usuarioAssociacao)
    .values({
      usuarioId: me.id,
      associacaoId,
      role: papel,
      status: "pendente",
    })
    .returning();

  res.status(201).json({ vinculo });
}

export async function gerenciarVinculo(req: AuthenticatedRequest, res: Response) {
  const { assocId, userId } = req.params as { assocId: string; userId: string };
  const { acao } = req.body as { acao: "aprovar" | "rejeitar" };

  const [adm] = await getUserById(req.userId!);
  if (!adm) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const [vinculoAdm] = await db
    .select()
    .from(usuarioAssociacao)
    .where(
      and(
        eq(usuarioAssociacao.associacaoId, assocId),
        eq(usuarioAssociacao.usuarioId, adm.id),
      ),
    )
    .limit(1);

  if (vinculoAdm?.role !== "adm" || vinculoAdm?.status !== "ativo") {
    res.status(403).json({ error: "Sem permissão para gerenciar esta associação" });
    return;
  }

  const novoStatus = acao === "aprovar" ? "ativo" : "rejeitado";
  const [atualizado] = await db
    .update(usuarioAssociacao)
    .set({
      status: novoStatus,
      joinedAt: acao === "aprovar" ? new Date() : null,
    })
    .where(
      and(
        eq(usuarioAssociacao.usuarioId, userId),
        eq(usuarioAssociacao.associacaoId, assocId),
      ),
    )
    .returning();

  res.json({ vinculo: atualizado });
}

// ─── Sanitize (remove campos sensíveis) ──────────────────────────────────────

function sanitize(user: typeof usuario.$inferSelect) {
  const { passwordHash: _ph, verificationToken: _vt, resetToken: _rt, resetTokenExpiresAt: _re, ...safe } = user;
  return safe;
}

