import { describe, it, expect, vi, beforeEach } from "vitest";

// Controla o retorno do select() — simula a query em usuario_associacao
let selectRows: any[] = [];

vi.mock("@espoa/database", () => {
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectRows)),
        })),
      })),
    })),
  };
  return {
    db,
    usuarioAssociacao: {
      id: "id",
      usuarioId: "usuario_id",
      associacaoId: "associacao_id",
      role: "role",
      status: "status",
    },
  };
});

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: any[]) => ({ and: args })),
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
}));

import {
  ensureUserIsAdmin,
  requireAdminFromBody,
  requireAdminFromResource,
  requireAdminOfAssociacao,
} from "../../middleware/admin.guard";

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("ensureUserIsAdmin", () => {
  beforeEach(() => {
    selectRows = [];
  });

  it("returns true when query returns a row", async () => {
    selectRows = [{ id: "row-1" }];
    expect(await ensureUserIsAdmin("user-1", "assoc-1")).toBe(true);
  });

  it("returns false when query returns no rows", async () => {
    selectRows = [];
    expect(await ensureUserIsAdmin("user-1", "assoc-1")).toBe(false);
  });
});

describe("requireAdminOfAssociacao", () => {
  beforeEach(() => {
    selectRows = [];
  });

  it("returns 401 when req.userId is missing", async () => {
    const mw = requireAdminOfAssociacao(() => "assoc-1");
    const res = makeRes();
    const next = vi.fn();
    await mw({} as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 when resolver returns null", async () => {
    const mw = requireAdminOfAssociacao(() => null);
    const res = makeRes();
    const next = vi.fn();
    await mw({ userId: "user-1" } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user is not admin", async () => {
    selectRows = []; // no row = not admin
    const mw = requireAdminOfAssociacao(() => "assoc-1");
    const res = makeRes();
    const next = vi.fn();
    await mw({ userId: "user-1" } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user is admin", async () => {
    selectRows = [{ id: "row-1" }]; // row = is admin
    const mw = requireAdminOfAssociacao(() => "assoc-1");
    const res = makeRes();
    const next = vi.fn();
    await mw({ userId: "user-1" } as any, res as any, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 500 when resolver throws", async () => {
    const mw = requireAdminOfAssociacao(() => {
      throw new Error("boom");
    });
    const res = makeRes();
    const next = vi.fn();
    await mw({ userId: "user-1" } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireAdminFromBody", () => {
  beforeEach(() => {
    selectRows = [];
  });

  it("reads associacao_id from snake_case body", async () => {
    selectRows = [{ id: "row-1" }];
    const res = makeRes();
    const next = vi.fn();
    await requireAdminFromBody(
      { userId: "user-1", body: { associacao_id: "assoc-1" } } as any,
      res as any,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it("reads associacaoId from camelCase body", async () => {
    selectRows = [{ id: "row-1" }];
    const res = makeRes();
    const next = vi.fn();
    await requireAdminFromBody(
      { userId: "user-1", body: { associacaoId: "assoc-1" } } as any,
      res as any,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 400 when body has no associacao_id", async () => {
    const res = makeRes();
    const next = vi.fn();
    await requireAdminFromBody(
      { userId: "user-1", body: {} } as any,
      res as any,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireAdminFromResource", () => {
  beforeEach(() => {
    selectRows = [];
  });

  it("returns 404 when loader returns null", async () => {
    const loader = vi.fn(async () => null);
    const mw = requireAdminFromResource(loader);
    const res = makeRes();
    const next = vi.fn();
    await mw(
      { userId: "user-1", params: { id: "rec-1" } } as any,
      res as any,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 when resource has no associacaoId", async () => {
    const loader = vi.fn(async () => ({ associacaoId: null }));
    const mw = requireAdminFromResource(loader);
    const res = makeRes();
    const next = vi.fn();
    await mw(
      { userId: "user-1", params: { id: "rec-1" } } as any,
      res as any,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 403 when user is not admin of resource's associacao", async () => {
    selectRows = []; // not admin
    const loader = vi.fn(async () => ({ associacaoId: "assoc-1" }));
    const mw = requireAdminFromResource(loader);
    const res = makeRes();
    const next = vi.fn();
    await mw(
      { userId: "user-1", params: { id: "rec-1" } } as any,
      res as any,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user is admin of resource's associacao", async () => {
    selectRows = [{ id: "row-1" }];
    const loader = vi.fn(async () => ({ associacaoId: "assoc-1" }));
    const mw = requireAdminFromResource(loader);
    const res = makeRes();
    const next = vi.fn();
    await mw(
      { userId: "user-1", params: { id: "rec-1" } } as any,
      res as any,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });
});
