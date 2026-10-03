// Standalone server for developing C's routes before A's skeleton lands. Not part of the final app.
import express from "express";
import cRouter from "./routes/c/index.js";
import { getDb, closeDb } from "./lib/db.js";
import { startChangeStreams, stopChangeStreams } from "./lib/changeStreams.js";

const app = express();
app.use(express.json());
app.use(cRouter);

const db = await getDb();
await startChangeStreams(db);
app.listen(Number(process.env.PORT ?? 4000), () => console.log("C dev server up"));

process.on("SIGINT", async () => {
  await stopChangeStreams();
  await closeDb();
  process.exit(0); // don't wait for open SSE connections to end
});
