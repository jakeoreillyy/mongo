// Agent responsible for the UI module. Works independently of auth/payments,
// demonstrating parallel non-conflicting work.
import { claimOrWait, release, recordDecision } from "./phalanx-toolkit.js";

const AGENT_ID = "agent-ui";
const RESOURCE = "ui";

async function run() {
  console.log(`[${AGENT_ID}] claiming ${RESOURCE}...`);
  await claimOrWait(AGENT_ID, RESOURCE, "Build dashboard component layout and navigation");

  console.log(`[${AGENT_ID}] working on ${RESOURCE}...`);
  await new Promise((r) => setTimeout(r, 4000));

  await recordDecision(AGENT_ID, RESOURCE, "Dashboard uses React with Tailwind. Navigation is a left sidebar with collapsible sections. All state flows through a single usePhalanx hook.");

  console.log(`[${AGENT_ID}] releasing ${RESOURCE}`);
  await release(AGENT_ID, RESOURCE);
}

run().catch((err) => {
  console.error(`[${AGENT_ID}] failed:`, err);
  process.exitCode = 1;
});
