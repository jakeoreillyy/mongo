// Fake stand-in for A's server. Implements the Step 0 contract in PHALANX-SPLIT.md
// with real in-memory state, so claim/conflict/release behave exactly like the
// real thing will. Delete this file once A's server is live — nothing else
// depends on it, everything talks to API_BASE_URL.
//
// similarTo and the waiter wake-up are mocked here per the plan's instruction
// ("B and D mock similarTo, warning, waiting and woken in the contract shape
// until A and C ship them"). The real versions are $vectorSearch (A) and a
// change-stream wake-up (C); this stub just does the synchronous equivalent
// so B's demo script can exercise the full contract shape without blocking
// on either of them.
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

type Waiter = {
  teamId: string;
  resource: string;
  agentId: string;
  createdAt: number;
};

const claims = new Map<string, Claim>();
const decisions: Decision[] = [];
const waiters: Waiter[] = [];
let nextDecisionId = 1;

const key = (teamId: string, resource: string) => `${teamId}:${resource}`;

// Stand-in for Vector Search: a fixed synonym table instead of real
// embeddings. Covers the plan's own example (login-flow ~ auth).
const SIMILAR: Record<string, string[]> = {
  auth: ["login-flow", "login", "signin", "sso"],
  payments: ["checkout", "billing"],
  ui: ["frontend", "checkout-ui"],
  db: ["database", "storage"],
};

function findSimilarHeld(teamId: string, resource: string, agentId: string): string | undefined {
  const now = Date.now();
  const related = new Set<string>(SIMILAR[resource] ?? []);
  for (const [group, synonyms] of Object.entries(SIMILAR)) {
    if (synonyms.includes(resource)) related.add(group);
  }
  for (const claim of claims.values()) {
    if (
      claim.teamId === teamId &&
      claim.agentId !== agentId &&
      claim.expiresAt > now &&
      related.has(claim.resource)
    ) {
      return claim.resource;
    }
  }
  return undefined;
}

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

  const similarTo = findSimilarHeld(teamId, resource, agentId);
  return res
    .status(201)
    .json(similarTo ? { status: "claimed", expiresAt, similarTo } : { status: "claimed", expiresAt });
});

app.post("/waiters", (req, res) => {
  const { teamId, resource, agentId } = req.body ?? {};
  if (!teamId || !resource || !agentId) {
    return res.status(400).json({ error: "teamId, resource, agentId required" });
  }
  waiters.push({ teamId, resource, agentId, createdAt: Date.now() });
  return res.status(201).json({ status: "waiting" });
});

app.delete("/claims/:resource", (req, res) => {
  const { teamId, agentId } = req.query as { teamId?: string; agentId?: string };
  const k = key(teamId ?? "", req.params.resource);
  const existing = claims.get(k);
  if (!existing || existing.agentId !== agentId) {
    return res.status(404).json({ error: "no claim held by this agent" });
  }
  claims.delete(k);

  // Wake the oldest waiter for this resource, same as the real server's
  // change-stream handler would: hand them the claim directly.
  const waiterIdx = waiters.findIndex(
    (w) => w.teamId === teamId && w.resource === req.params.resource
  );
  let woken: { agentId: string } | undefined;
  if (waiterIdx !== -1) {
    const [waiter] = waiters.splice(waiterIdx, 1);
    const expiresAt = Date.now() + 300 * 1000;
    claims.set(k, {
      teamId: waiter.teamId,
      resource: waiter.resource,
      agentId: waiter.agentId,
      task: "woken from wait_for_resource",
      createdAt: Date.now(),
      expiresAt,
    });
    woken = { agentId: waiter.agentId };
  }

  return res.status(200).json(woken ? { status: "released", woken } : { status: "released" });
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
