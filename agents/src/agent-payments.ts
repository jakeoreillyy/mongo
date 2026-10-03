// Agent responsible for the payments module. Also tries to claim auth (to show
// the conflict/wait path when agent-auth holds it).
import { claimOrWait, release, recordDecision, getBriefing } from "./phalanx-toolkit.js";

const AGENT_ID = "agent-payments";

async function run() {
  console.log(`[${AGENT_ID}] starting — reading briefing`);
  const briefing = await getBriefing();
  console.log(`[${AGENT_ID}] briefing: ${briefing.claims.length} claims, ${briefing.decisions.length} decisions`);

  // Claim payments — should succeed immediately
  console.log(`[${AGENT_ID}] claiming payments...`);
  await claimOrWait(AGENT_ID, "payments", "Integrate Stripe checkout and webhook handling");

  // Try to claim auth — will block if agent-auth holds it
  console.log(`[${AGENT_ID}] also need auth for payment auth integration...`);
  const authResult = await claimOrWait(AGENT_ID, "auth", "Add payment-specific auth scopes");

  // Simulate work on payments
  console.log(`[${AGENT_ID}] working on payments + auth integration...`);
  await new Promise((r) => setTimeout(r, 2000));

  await recordDecision(AGENT_ID, "payments", "Stripe webhooks verified with endpoint secret. Idempotency keys stored in MongoDB to prevent double charges.");

  console.log(`[${AGENT_ID}] releasing auth and payments`);
  await release(AGENT_ID, "auth");
  await release(AGENT_ID, "payments");
}

run().catch((err) => {
  console.error(`[${AGENT_ID}] failed:`, err);
  process.exitCode = 1;
});
