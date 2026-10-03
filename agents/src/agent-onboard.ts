// Late-joining agent. Calls get_briefing to understand the current state before
// doing any work — the "newcomer gets context instantly" demo beat.
import { getBriefing, listClaims, claimOrWait, release, recordDecision } from "./phalanx-toolkit.js";

const AGENT_ID = "agent-onboard";

async function run() {
  console.log(`[${AGENT_ID}] just joined the team — reading the briefing`);

  const briefing = await getBriefing();
  console.log(`[${AGENT_ID}] active claims: ${briefing.claims.length}`);
  for (const c of briefing.claims) {
    console.log(`  ${c.resource}: held by ${c.agentId} (${c.task})`);
  }
  console.log(`[${AGENT_ID}] recent decisions: ${briefing.decisions.length}`);
  for (const d of briefing.decisions) {
    console.log(`  [${d.module}] ${d.agentId}: "${d.text}"`);
  }

  // Pick up an unclaimed resource
  const claims = await listClaims();
  const held = new Set(claims.map((c) => c.resource));
  const available = ["auth", "payments", "ui", "db", "search"].filter((r) => !held.has(r));

  if (available.length === 0) {
    console.log(`[${AGENT_ID}] everything is claimed, waiting for db...`);
    await claimOrWait(AGENT_ID, "db", "Schema migration tooling");
  } else {
    const pick = available[0];
    console.log(`[${AGENT_ID}] ${pick} is free, claiming it`);
    await claimOrWait(AGENT_ID, pick, `Work on ${pick} module`);

    await new Promise((r) => setTimeout(r, 2000));
    await recordDecision(AGENT_ID, pick, `Reviewed existing decisions and aligned ${pick} implementation with team conventions.`);
    await release(AGENT_ID, pick);
  }
}

run().catch((err) => {
  console.error(`[${AGENT_ID}] failed:`, err);
  process.exitCode = 1;
});
