// POST /decisions       body { teamId, module, agentId, text, supersedes? } -> 201 { id }
// GET  /decisions/:id/lineage?teamId  -> the supersedes chain ("why JWT?")
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../../lib/db.js";

const router = Router();

router.post("/decisions", async (req, res) => {
  const { teamId, module, agentId, text, supersedes } = req.body ?? {};
  for (const [k, v] of Object.entries({ teamId, module, agentId, text })) {
    if (typeof v !== "string" || !v.trim()) return res.status(400).json({ error: `${k} is required` });
  }
  const doc: Record<string, unknown> = { teamId, module, agentId, text, createdAt: new Date() };
  if (supersedes) {
    if (typeof supersedes !== "string" || !ObjectId.isValid(supersedes)) return res.status(400).json({ error: "supersedes must be a decision id" });
    doc.supersedes = new ObjectId(supersedes);
  }
  const db = await getDb();
  const { insertedId } = await db.collection("decisions").insertOne(doc);
  res.status(201).json({ id: String(insertedId) });
});

// Optional lineage: walk the supersedes chain with $graphLookup.
router.get("/decisions/:id/lineage", async (req, res) => {
  const teamId = String(req.query.teamId ?? "");
  if (!teamId || !ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "teamId and a valid id are required" });
  }
  const db = await getDb();
  const [result] = await db
    .collection("decisions")
    .aggregate([
      { $match: { _id: new ObjectId(req.params.id), teamId } },
      {
        $graphLookup: {
          from: "decisions",
          startWith: "$supersedes",
          connectFromField: "supersedes",
          connectToField: "_id",
          restrictSearchWithMatch: { teamId },
          depthField: "depth",
          as: "history",
        },
      },
      // $graphLookup returns history in no particular order; nearest ancestor first.
      { $set: { history: { $sortArray: { input: "$history", sortBy: { depth: 1 } } } } },
      { $project: { embedding: 0, "history.embedding": 0 } },
    ])
    .toArray();
  if (!result) return res.status(404).json({ error: "not found" });
  res.json(result);
});

export default router;
