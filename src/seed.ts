import "dotenv/config";
import { connectDb } from "./db";

const TEAM_ID = "demo";

async function seed() {
  const db = await connectDb();

  // Wipe all data for the demo team. Waiters first: the server hands each released claim to a waiter.
  const waiters = await db.collection("waiters").deleteMany({ teamId: TEAM_ID });
  const deleted = await Promise.all([
    db.collection("claims").deleteMany({ teamId: TEAM_ID }),
    db.collection("decisions").deleteMany({ teamId: TEAM_ID }),
    db.collection("conflicts").deleteMany({ teamId: TEAM_ID }),
  ]);

  console.log(`Cleared team "${TEAM_ID}":`);
  console.log(`  claims:    ${deleted[0].deletedCount} removed`);
  console.log(`  decisions: ${deleted[1].deletedCount} removed`);
  console.log(`  conflicts: ${deleted[2].deletedCount} removed`);
  console.log(`  waiters:   ${waiters.deletedCount} removed`);

  console.log(`\nTeam "${TEAM_ID}" is now clean. Ready for demo.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
