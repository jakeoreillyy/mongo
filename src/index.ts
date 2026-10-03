import "dotenv/config";
import express from "express";
import { connectDb } from "./db";
import { startChangeStreams } from "./changeStreams";
import { claimsRouter } from "./routes/claims";
import { decisionsRouter } from "./routes/decisions";
import { briefingRouter } from "./routes/briefing";
import { eventsRouter } from "./routes/events";
import { waitersRouter } from "./routes/waiters";

const app = express();
app.use(express.json());

app.use("/claims", claimsRouter);
app.use("/decisions", decisionsRouter);
app.use("/briefing", briefingRouter);
app.use("/events", eventsRouter);
app.use("/waiters", waitersRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = parseInt(process.env.PORT || "3000", 10);

async function start() {
  await connectDb();
  await startChangeStreams();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Phalanx server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});

export { app };
