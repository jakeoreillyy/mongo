// Scripted demo per PHALANX-SPLIT.md "B: MCP server and demo agents" step 5.
// Fixed order, short pauses, calls the same api-client every tool uses - so
// this exercises the real claim/conflict/wait/similarTo/decision/briefing
// path end to end.
import * as api from "./api-client.js";

const TEAM_ID = process.env.TEAM_ID ?? "demo";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function log(agent: string, action: string, result: unknown) {
  console.log(`[${agent}] ${action} ->`, JSON.stringify(result));
}

async function main() {
  await pause(500);
  log("Agent 1", "claim auth", await api.claimResource({
    teamId: TEAM_ID, resource: "auth", agentId: "agent-1", task: "JWT auth flow",
  }));

  await pause(500);
  log("Agent 2", "claim payments", await api.claimResource({
    teamId: TEAM_ID, resource: "payments", agentId: "agent-2", task: "Stripe checkout",
  }));

  await pause(800);
  log("Agent 2", "claim auth (expect blocked)", await api.claimResource({
    teamId: TEAM_ID, resource: "auth", agentId: "agent-2", task: "tweak auth",
  }));

  await pause(500);
  log("Agent 2", "wait_for_resource auth (instead of guessing)", await api.waitForResource({
    teamId: TEAM_ID, resource: "auth", agentId: "agent-2",
  }));

  await pause(800);
  log("Agent 3", "claim login-flow (expect similarTo: auth)", await api.claimResource({
    teamId: TEAM_ID, resource: "login-flow", agentId: "agent-3", task: "social login",
  }));

  await pause(800);
  log("Agent 1", "record decision", await api.recordDecision({
    teamId: TEAM_ID, module: "auth", agentId: "agent-1", text: "auth uses JWT, not sessions",
  }));

  await pause(500);
  log("Agent 1", "release auth (expect Agent 2 woken)", await api.releaseResource({
    teamId: TEAM_ID, resource: "auth", agentId: "agent-1",
  }));

  await pause(500);
  log("Agent 2", "list_claims (confirm auth was handed over)", await api.listClaims(TEAM_ID));

  await pause(800);
  log("Agent 4", "get_briefing (joining fresh)", await api.getBriefing(TEAM_ID));
}

main().catch((err) => {
  console.error("demo script failed:", err);
  process.exit(1);
});
