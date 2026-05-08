import type { Request, Response } from "express";
import { runSync } from "../services/sync.service";
import type { PushOperation, SyncRequestBody } from "../sync/sync.types";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function postSync(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as SyncRequestBody;
    const deviceId = body?.deviceId;

    if (!deviceId) {
      return res.status(400).json({ error: "deviceId is required" });
    }

    const push = Array.isArray(body?.push)
      ? (body.push as PushOperation[])
      : [];
    const parsedDate = body?.lastPulledAt ? new Date(body.lastPulledAt) : null;
    const lastPulledAt =
      parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    const result = await runSync({
      deviceId,
      userId: authReq.userId,
      push,
      lastPulledAt,
    });

    return res.json(result);
  } catch (error) {
    console.error("/sync error", error instanceof Error ? error.message : error);
    console.error("/sync stack", error instanceof Error ? error.stack : "no stack");
    return res.status(500).json({ error: "sync_failed" });
  }
}
