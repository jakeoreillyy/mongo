// GET /briefing?teamId&module   (module optional) -> { claims, decisions }
import { Router } from "express";
import { getDb } from "../db";

export const briefingRouter = Router();

briefingRouter.get("/", async (req, res) => {
  const teamId = String(req.query.teamId ?? "");
  const module = req.query.module ? String(req.query.module) : undefined;
  if (!teamId) return res.status(400).json({ error: "teamId is required" });

  const db = getDb();

  // Active claims: not expired (TTL can lag up to a minute, so check expiresAt ourselves).
  const claims = await db
    .collection("claims")
    .find({ teamId, expiresAt: { $gt: new Date() } }, { projection: { embedding: 0 } })
    .toArray();

  // Last 10 decisions for the team, narrowed to the module if given.
  const decisions = await db
    .collection("decisions")
    .aggregate([
      { $match: { teamId, ...(module && { module }) } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      { $project: { embedding: 0 } },
    ])
    .toArray();

  res.json({ claims, decisions });
});
