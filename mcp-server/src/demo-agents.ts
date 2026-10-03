// Scripted demo per PHALANX-SPLIT.md "B: MCP server and demo agents" step 5.
// Calls the same api-client every tool uses, so this exercises the real
// claim/conflict/wait/expiry/decision/briefing path end to end.
//
// In a terminal it waits for Enter before each step, so the presenter sets the
// pace. Piped or with DEMO_AUTO=1 it runs straight through with short pauses.
import * as readline from "node:readline/promises";
import * as api from "./api-client.js";

const TEAM_ID = process.env.TEAM_ID ?? "demo";
const AUTO = process.env.DEMO_AUTO === "1" || !process.stdin.isTTY;
const CRASH_TTL_SECONDS = 15;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rl = AUTO ? null : readline.createInterface({ input: process.stdin, output: process.stdout });

let stepNo = 0;
async function step(cue: string) {
  stepNo += 1;
  if (rl) await rl.question(`\n\x1b[2m${stepNo}. ${cue}  [Enter]\x1b[0m`);
  else await pause(600);
}

function log(agent: string, action: string, result: unknown) {
  console.log(`[${agent}] ${action} ->`, JSON.stringify(result));
}

async function main() {
  await step("agent-1 claims auth");
  log("Agent 1", "claim auth", await api.claimResource({
    teamId: TEAM_ID, resource: "auth", agentId: "agent-1", task: "JWT auth flow",
  }));

  await step("agent-2 claims payments");
  log("Agent 2", "claim payments", await api.claimResource({
    teamId: TEAM_ID, resource: "payments", agentId: "agent-2", task: "Stripe checkout",
  }));

  await step("agent-2 tries auth: blocked by the unique index");
  log("Agent 2", "claim auth (expect blocked)", await api.claimResource({
    teamId: TEAM_ID, resource: "auth", agentId: "agent-2", task: "tweak auth",
  }));

  await step("agent-2 waits in line for auth");
  log("Agent 2", "wait_for_resource auth (instead of guessing)", await api.waitForResource({
    teamId: TEAM_ID, resource: "auth", agentId: "agent-2",
  }));

  await step(`agent-3 claims search for ${CRASH_TTL_SECONDS}s, then crashes`);
  log("Agent 3", `claim search (ttl ${CRASH_TTL_SECONDS}s), then crash`, await api.claimResource({
    teamId: TEAM_ID, resource: "search", agentId: "agent-3", task: "full-text search",
    ttlSeconds: CRASH_TTL_SECONDS,
  }));
  const crashedAt = Date.now();

  await step("agent-1 records a decision");
  log("Agent 1", "record decision", await api.recordDecision({
    teamId: TEAM_ID, module: "auth", agentId: "agent-1", text: "auth uses JWT, not sessions",
  }));

  await step("agent-1 releases auth: agent-2 is woken");
  log("Agent 1", "release auth (expect Agent 2 woken)", await api.releaseResource({
    teamId: TEAM_ID, resource: "auth", agentId: "agent-1",
  }));

  await step("agent-5 claims search: the crashed claim has expired");
  // The handover above must not let the presenter beat the expiry.
  const left = crashedAt + CRASH_TTL_SECONDS * 1000 + 500 - Date.now();
  if (left > 0) {
    console.log(`(waiting ${Math.ceil(left / 1000)}s for agent-3's claim to expire)`);
    await pause(left);
  }
  log("Agent 5", "claim search (expect claimed, agent-3's claim expired)", await api.claimResource({
    teamId: TEAM_ID, resource: "search", agentId: "agent-5", task: "full-text search",
  }));

  await step("agent-4 joins fresh and gets the briefing");
  log("Agent 4", "get_briefing (joining fresh)", await api.getBriefing(TEAM_ID));
}

main()
  .catch((err) => {
    console.error("demo script failed:", err);
    process.exitCode = 1;
  })
  .finally(() => rl?.close());
