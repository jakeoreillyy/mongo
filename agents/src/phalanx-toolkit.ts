// Shared toolkit for AI agents. Each agent calls these before and after editing
// code. The Phalanx server enforces one-holder-per-resource via the unique index;
// this module turns a 409 into a wait-and-retry loop so agents don't have to
// handle coordination manually.
import "dotenv/config";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const TEAM_ID = process.env.TEAM_ID ?? "demo";
const DEFAULT_TTL = 300;
const POLL_INTERVAL_MS = 2000;

export interface ClaimResult {
  status: "claimed" | "blocked";
  expiresAt?: string;
  heldBy?: string;
  task?: string;
}

export interface Claim {
  teamId: string;
  resource: string;
  agentId: string;
  task: string;
  createdAt: string;
  expiresAt: string;
}

export interface Decision {
  id: string;
  teamId: string;
  module: string;
  agentId: string;
  text: string;
  createdAt: string;
}

export interface Briefing {
  claims: Claim[];
  decisions: Decision[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 409 && res.status !== 404) {
    throw new Error(`${path} -> ${res.status}: ${JSON.stringify(body)}`);
  }
  return body as T;
}

// Claim a resource. If blocked, register as a waiter and poll until it's free.
export async function claimOrWait(
  agentId: string,
  resource: string,
  task: string,
  ttlSeconds = DEFAULT_TTL,
): Promise<ClaimResult> {
  const result = await request<ClaimResult>("/claims", {
    method: "POST",
    body: JSON.stringify({ teamId: TEAM_ID, resource, agentId, task, ttlSeconds }),
  });

  if (result.status === "claimed") return result;

  // Blocked — register as waiter so the change stream wakes us
  console.log(`[${agentId}] blocked on ${resource} (held by ${result.heldBy}), waiting...`);
  await request("/waiters", {
    method: "POST",
    body: JSON.stringify({ teamId: TEAM_ID, resource, agentId }),
  });

  // Poll until we hold it (the server hands it to us via the waiter queue)
  while (true) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const claims = await request<Claim[]>(`/claims?teamId=${TEAM_ID}`);
    const mine = claims.find((c) => c.resource === resource && c.agentId === agentId);
    if (mine) {
      console.log(`[${agentId}] acquired ${resource}`);
      return { status: "claimed", expiresAt: mine.expiresAt };
    }
  }
}

export async function release(agentId: string, resource: string): Promise<void> {
  const q = new URLSearchParams({ teamId: TEAM_ID, agentId });
  await request(`/claims/${encodeURIComponent(resource)}?${q}`, { method: "DELETE" });
  console.log(`[${agentId}] released ${resource}`);
}

export async function recordDecision(
  agentId: string,
  module: string,
  text: string,
): Promise<{ id: string }> {
  const result = await request<{ id: string }>("/decisions", {
    method: "POST",
    body: JSON.stringify({ teamId: TEAM_ID, module, agentId, text }),
  });
  console.log(`[${agentId}] recorded decision on ${module}: "${text}"`);
  return result;
}

export async function getBriefing(module?: string): Promise<Briefing> {
  const q = new URLSearchParams({ teamId: TEAM_ID, ...(module ? { module } : {}) });
  return request<Briefing>(`/briefing?${q}`);
}

export async function listClaims(): Promise<Claim[]> {
  return request<Claim[]>(`/claims?teamId=${TEAM_ID}`);
}

export { TEAM_ID };
