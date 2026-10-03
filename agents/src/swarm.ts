// Launches multiple agents concurrently to demonstrate the coordination layer.
// Agents claim resources, collide, wait, and eventually all complete their work.
//
// Run:  npm run swarm       (interactive, press Enter between phases)
// Run:  npm run swarm:auto  (non-interactive, runs straight through)
import { spawn } from "node:child_process";
import * as readline from "node:readline/promises";
import { listClaims, getBriefing, TEAM_ID } from "./phalanx-toolkit.js";

const AUTO = process.env.DEMO_AUTO === "1" || !process.stdin.isTTY;
const rl = AUTO ? null : readline.createInterface({ input: process.stdin, output: process.stdout });

async function step(cue: string) {
  if (rl) await rl.question(`\n\x1b[36m▸ ${cue}  [Enter]\x1b[0m`);
  else await new Promise((r) => setTimeout(r, 1500));
}

function runAgent(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", `src/${script}`], {
      cwd: new URL("..", import.meta.url).pathname,
      stdio: "inherit",
      env: { ...process.env },
      shell: true,
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

async function main() {
  console.log(`\n\x1b[1m═══ Phalanx Swarm: ${TEAM_ID} ═══\x1b[0m\n`);

  await step("Phase 1: agent-auth and agent-ui start in parallel");
  const auth = runAgent("agent-auth.ts");
  const ui = runAgent("agent-ui.ts");

  // Give auth a head start so it holds the claim when payments arrives
  await new Promise((r) => setTimeout(r, 2000));

  await step("Phase 2: agent-payments starts (will collide on auth)");
  const payments = runAgent("agent-payments.ts");

  // Wait for the first wave to settle
  await auth;
  await ui;

  await step("Phase 3: agent-onboard joins fresh and reads the briefing");
  const onboard = runAgent("agent-onboard.ts");

  await payments;
  await onboard;

  console.log(`\n\x1b[1m═══ All agents completed ═══\x1b[0m\n`);

  // Show the final state
  const claims = await listClaims();
  const briefing = await getBriefing();
  console.log(`Final state: ${claims.length} active claims, ${briefing.decisions.length} decisions recorded\n`);
  for (const d of briefing.decisions) {
    console.log(`  [${d.module}] ${d.agentId}: "${d.text}"`);
  }
}

main()
  .catch((err) => {
    console.error("swarm failed:", err);
    process.exitCode = 1;
  })
  .finally(() => rl?.close());
