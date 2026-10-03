import "dotenv/config";
import { connectDb } from "./db";

async function setup() {
  const db = await connectDb();

  // Create collections (no-op if they already exist)
  const existing = (await db.listCollections().toArray()).map((c) => c.name);

  for (const name of ["claims", "decisions", "conflicts"]) {
    if (!existing.includes(name)) {
      await db.createCollection(name);
      console.log(`Created collection: ${name}`);
    } else {
      console.log(`Collection already exists: ${name}`);
    }
  }

  // Helper: create index, skip if an equivalent already exists under a different name
  async function ensureIndex(
    collName: string,
    spec: Record<string, number>,
    opts: { unique?: boolean; expireAfterSeconds?: number; name: string }
  ) {
    try {
      await db.collection(collName).createIndex(spec, opts);
      console.log(`Index: ${collName}.${opts.name} (created)`);
    } catch (err: any) {
      if (err.code === 85 || err.code === 86) {
        console.log(`Index: ${collName}.${opts.name} (equivalent already exists, skipped)`);
      } else {
        throw err;
      }
    }
  }

  await ensureIndex("claims", { teamId: 1, resource: 1 }, { unique: true, name: "teamId_resource_unique" });
  await ensureIndex("claims", { expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" });
  await ensureIndex("decisions", { teamId: 1, module: 1, createdAt: -1 }, { name: "teamId_module_createdAt" });

  console.log("\nSetup complete.");
  process.exit(0);
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
