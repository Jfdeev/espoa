import { db } from "@espoa/database";
import { usuario, associacao, usuarioAssociacao } from "@espoa/database";
import { eq, ilike, or } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import type { Response } from "express";


export async function syncUser(req: AuthenticatedRequest, res: Response) {
  const { nome, telefone, avatarUrl, authProvider } = req.body as {
    nome: string;
    telefone?: string;
    avatarUrl?: string;
    authProvider: "google" | "email";
  };

  if (!req.uid || !req.email) {
    res.status(400).json({ error: "Dados de autenticação ausentes" });
    return;
  }

  const existing = await db
    .select()
    .from(usuario)
    .where(eq(usuario.firebaseUid, req.uid))
    .limit(1);

  if (existing.length > 0) {
    res.json({ usuario: existing[0] });
    return;
  }

  const [created] = await db
    .insert(usuario)
    .values({
      firebaseUid: req.uid,
      email: req.email,
      nome: nome ?? req.email.split("@")[0],
      telefone,
      avatarUrl,
      authProvider: authProvider ?? "email",
    })
    .returning();

  res.status(201).json({ usuario: created });
}


export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.uid) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const [me] = await db
    .select()
    .from(usuario)
    .where(eq(usuario.firebaseUid, req.uid))
    .limit(1);

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

  res.json({ usuario: me, vinculos });
}

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
      q.length > 1
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

  if (!req.uid) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const [me] = await db
    .select()
    .from(usuario)
    .where(eq(usuario.firebaseUid, req.uid))
    .limit(1);

  if (!me) {
    res.status(404).json({ error: "Usuário não encontrado. Sincronize primeiro." });
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

  if (!req.uid) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const [me] = await db
    .select()
    .from(usuario)
    .where(eq(usuario.firebaseUid, req.uid))
    .limit(1);

  if (!me) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const existente = await db
    .select()
    .from(usuarioAssociacao)
    .where(
      eq(usuarioAssociacao.usuarioId, me.id),
    )
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
      role: "associado",
      status: "pendente",
    })
    .returning();

  res.status(201).json({ vinculo });
}

export async function gerenciarVinculo(req: AuthenticatedRequest, res: Response) {
  const { assocId, userId } = req.params as { assocId: string; userId: string };
  const { acao } = req.body as { acao: "aprovar" | "rejeitar" };

  if (!req.uid) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const [adm] = await db
    .select()
    .from(usuario)
    .where(eq(usuario.firebaseUid, req.uid))
    .limit(1);

  if (!adm) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const vinculoAdm = await db
    .select()
    .from(usuarioAssociacao)
    .where(
      eq(usuarioAssociacao.associacaoId, assocId as string),
    )
    .limit(1);

  if (!vinculoAdm.length || vinculoAdm[0].usuarioId !== adm.id || vinculoAdm[0].role !== "adm") {
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
    .where(eq(usuarioAssociacao.usuarioId, userId as string))
    .returning();

  res.json({ vinculo: atualizado });
}
