import { Router, Request, Response } from "express";
import { getDb } from "../db";

export const claimsRouter = Router();

// POST /claims — claim a resource
claimsRouter.post("/", async (req: Request, res: Response) => {
  const { teamId, resource, agentId, task, ttlSeconds } = req.body;

  if (!teamId || !resource || !agentId || !task || !ttlSeconds) {
    res.status(400).json({ error: "Missing required fields: teamId, resource, agentId, task, ttlSeconds" });
    return;
  }

  const db = getDb();
  const claims = db.collection("claims");
  const conflicts = db.collection("conflicts");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  const doc = { teamId, resource, agentId, task, createdAt: now, expiresAt };

  try {
    await claims.insertOne(doc);
    res.status(201).json({ status: "claimed", expiresAt });
    return;
  } catch (err: any) {
    if (err.code !== 11000) throw err;

    // Duplicate key — check if the existing holder has expired (app-level expiry)
    const deleted = await claims.findOneAndDelete({
      teamId,
      resource,
      expiresAt: { $lt: now },
    });

    if (deleted) {
      // Expired claim removed, retry insert once
      try {
        await claims.insertOne(doc);
        res.status(201).json({ status: "claimed", expiresAt });
        return;
      } catch (retryErr: any) {
        if (retryErr.code !== 11000) throw retryErr;
        // Someone else claimed it between delete and retry — fall through to blocked
      }
    }

    // Look up the current holder
    const holder = await claims.findOne({ teamId, resource });
    if (!holder) {
      // Race condition: claim was released between our check — tell agent to retry
      res.status(409).json({ status: "blocked", heldBy: "unknown", task: "unknown", expiresAt: null });
      return;
    }

    // Record the conflict so change streams can see it
    await conflicts.insertOne({
      teamId,
      resource,
      agentId,
      heldBy: holder.agentId,
      createdAt: now,
    });

    res.status(409).json({
      status: "blocked",
      heldBy: holder.agentId,
      task: holder.task,
      expiresAt: holder.expiresAt,
    });
  }
});

// DELETE /claims/:resource — release a claim (only the holder can release)
claimsRouter.delete("/:resource", async (req: Request, res: Response) => {
  const { resource } = req.params;
  const teamId = req.query.teamId as string;
  const agentId = req.query.agentId as string;

  if (!teamId || !agentId) {
    res.status(400).json({ error: "Missing required query params: teamId, agentId" });
    return;
  }

  const db = getDb();
  const result = await db.collection("claims").deleteOne({ teamId, resource, agentId });

  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Claim not found or you are not the holder" });
    return;
  }

  res.json({ status: "released" });
});

// GET /claims — list active claims for a team (filter out expired)
claimsRouter.get("/", async (req: Request, res: Response) => {
  const teamId = req.query.teamId as string;

  if (!teamId) {
    res.status(400).json({ error: "Missing required query param: teamId" });
    return;
  }

  const db = getDb();
  const now = new Date();
  const activeClaims = await db
    .collection("claims")
    .find({ teamId, expiresAt: { $gt: now } })
    .toArray();

  res.json(activeClaims);
});
