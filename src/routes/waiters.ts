// POST /waiters   body { teamId, resource, agentId } -> 201 { status: "waiting" }
// The change stream emits `waiting`. When the resource frees (at once if it already has), the oldest waiter is
// given the claim (a `claimed` event) and `woken` is emitted, so the agent doesn't need to re-claim.
import { Router } from "express";
import { getDb } from "../db";

export const waitersRouter = Router();

waitersRouter.post("/", async (req, res) => {
  const { teamId, resource, agentId } = req.body ?? {};
  for (const [k, v] of Object.entries({ teamId, resource, agentId })) {
    if (typeof v !== "string" || !v.trim()) return res.status(400).json({ error: `${k} is required` });
  }
  // Upsert so an agent waiting twice on the same resource only queues once.
  await getDb()
    .collection("waiters")
    .updateOne({ teamId, resource, agentId }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  res.status(201).json({ status: "waiting" });
});
