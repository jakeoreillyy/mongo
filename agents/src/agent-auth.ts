// Agent responsible for the auth module. Claims "auth", makes architectural
// decisions, then releases for the next agent.
import { claimOrWait, release, recordDecision, getBriefing } from "./phalanx-toolkit.js";

const AGENT_ID = "agent-auth";
const RESOURCE = "auth";

async function run() {
  console.log(`[${AGENT_ID}] starting — checking what's happening first`);
  const briefing = await getBriefing(RESOURCE);
  console.log(`[${AGENT_ID}] briefing: ${briefing.claims.length} active claims, ${briefing.decisions.length} decisions`);

  console.log(`[${AGENT_ID}] claiming ${RESOURCE}...`);
  await claimOrWait(AGENT_ID, RESOURCE, "Implement JWT authentication flow");

  // Simulate work
  console.log(`[${AGENT_ID}] working on ${RESOURCE}...`);
  await new Promise((r) => setTimeout(r, 3000));

  await recordDecision(AGENT_ID, RESOURCE, "Auth uses JWT with RS256 signing. Refresh tokens stored in httpOnly cookies. Access tokens expire after 15 minutes.");

  await new Promise((r) => setTimeout(r, 1000));

  await recordDecision(AGENT_ID, RESOURCE, "Password hashing uses bcrypt with cost factor 12. Rate limiting on /login at 5 attempts per minute per IP.");

  console.log(`[${AGENT_ID}] done with ${RESOURCE}, releasing`);
  await release(AGENT_ID, RESOURCE);
}

run().catch((err) => {
  console.error(`[${AGENT_ID}] failed:`, err);
  process.exitCode = 1;
});
