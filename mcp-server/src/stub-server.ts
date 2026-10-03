// Fake stand-in for A's server. Implements the Step 0 contract in PHALANX-SPLIT.md
// with real in-memory state, so claim/conflict/release behave exactly like the
// real thing will. Delete this file once A's server is live — nothing else
// depends on it, everything talks to API_BASE_URL.
import express from "express";

type Claim = {
  teamId: string;
  resource: string;
  agentId: string;
  task: string;
  createdAt: number;
  expiresAt: number;
};

type Decision = {
  id: string;
  teamId: string;
  module: string;
  agentId: string;
  text: string;
  createdAt: number;
};

const claims = new Map<string, Claim>();
const decisions: Decision[] = [];
let nextDecisionId = 1;

const key = (teamId: string, resource: string) => `${teamId}:${resource}`;

const app = express();
app.use(express.json());

app.post("/claims", (req, res) => {
  const { teamId, resource, agentId, task, ttlSeconds } = req.body ?? {};
  if (!teamId || !resource || !agentId || !task) {
    return res.status(400).json({ error: "teamId, resource, agentId, task required" });
  }
  const k = key(teamId, resource);
  const existing = claims.get(k);
  const now = Date.now();

  if (existing && existing.expiresAt > now) {
    return res.status(409).json({
      status: "blocked",
      heldBy: existing.agentId,
      task: existing.task,
      expiresAt: existing.expiresAt,
    });
  }

  const expiresAt = now + (ttlSeconds ?? 300) * 1000;
  claims.set(k, { teamId, resource, agentId, task, createdAt: now, expiresAt });
  return res.status(201).json({ status: "claimed", expiresAt });
});

app.delete("/claims/:resource", (req, res) => {
  const { teamId, agentId } = req.query as { teamId?: string; agentId?: string };
  const k = key(teamId ?? "", req.params.resource);
  const existing = claims.get(k);
  if (!existing || existing.agentId !== agentId) {
    return res.status(404).json({ error: "no claim held by this agent" });
  }
  claims.delete(k);
  return res.status(200).json({ status: "released" });
});

app.get("/claims", (req, res) => {
  const { teamId } = req.query as { teamId?: string };
  const now = Date.now();
  const list = [...claims.values()].filter(
    (c) => c.teamId === teamId && c.expiresAt > now
  );
  return res.json(list);
});

app.post("/decisions", (req, res) => {
  const { teamId, module, agentId, text } = req.body ?? {};
  if (!teamId || !module || !agentId || !text) {
    return res.status(400).json({ error: "teamId, module, agentId, text required" });
  }
  const id = String(nextDecisionId++);
  decisions.push({ id, teamId, module, agentId, text, createdAt: Date.now() });
  return res.status(201).json({ id });
});

app.get("/briefing", (req, res) => {
  const { teamId, module } = req.query as { teamId?: string; module?: string };
  const now = Date.now();
  const activeClaims = [...claims.values()].filter(
    (c) => c.teamId === teamId && c.expiresAt > now
  );
  const relevantDecisions = decisions
    .filter((d) => d.teamId === teamId && (!module || d.module === module))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);
  return res.json({ claims: activeClaims, decisions: relevantDecisions });
});

// /events (SSE) is C's territory in the real server and nothing B owns reads
// it, so it's intentionally left out of the stub.

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`[stub] fake A server listening on http://localhost:${PORT}`);
});
