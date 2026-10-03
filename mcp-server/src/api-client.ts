// Single point of contact with A's server. Swapping stub -> real server is
// changing API_BASE_URL in .env, nothing in this file or its callers changes.
import "dotenv/config";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

export type ClaimResult =
  | { status: "claimed"; expiresAt: number }
  | { status: "blocked"; heldBy: string; task: string; expiresAt: number };

export type Claim = {
  teamId: string;
  resource: string;
  agentId: string;
  task: string;
  createdAt: number;
  expiresAt: number;
};

export type Decision = {
  id: string;
  teamId: string;
  module: string;
  agentId: string;
  text: string;
  createdAt: number;
};

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

export function claimResource(params: {
  teamId: string;
  resource: string;
  agentId: string;
  task: string;
  ttlSeconds?: number;
}) {
  return request<ClaimResult>("/claims", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function releaseResource(params: { teamId: string; resource: string; agentId: string }) {
  const q = new URLSearchParams({ teamId: params.teamId, agentId: params.agentId });
  return request<{ status: "released" } | { error: string }>(
    `/claims/${encodeURIComponent(params.resource)}?${q}`,
    { method: "DELETE" }
  );
}

export function listClaims(teamId: string) {
  return request<Claim[]>(`/claims?${new URLSearchParams({ teamId })}`);
}

export function recordDecision(params: {
  teamId: string;
  module: string;
  agentId: string;
  text: string;
}) {
  return request<{ id: string }>("/decisions", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function getBriefing(teamId: string, module?: string) {
  const q = new URLSearchParams({ teamId, ...(module ? { module } : {}) });
  return request<{ claims: Claim[]; decisions: Decision[] }>(`/briefing?${q}`);
}
