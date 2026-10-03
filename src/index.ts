import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { connectDb } from "./db";
import { startChangeStreams } from "./changeStreams";
import { claimsRouter } from "./routes/claims";
import { decisionsRouter } from "./routes/decisions";
import { briefingRouter } from "./routes/briefing";
import { eventsRouter } from "./routes/events";
import { waitersRouter } from "./routes/waiters";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/claims", claimsRouter);
app.use("/decisions", decisionsRouter);
app.use("/briefing", briefingRouter);
app.use("/events", eventsRouter);
app.use("/waiters", waitersRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Serve dashboard static files (built by Vite into /app/dashboard-dist in Docker)
const dashboardPath = path.join(__dirname, "..", "dashboard-dist");
app.use(express.static(dashboardPath));
app.get("*", (_req, res, next) => {
  // Only serve index.html for non-API requests (SPA fallback)
  if (_req.path.startsWith("/claims") || _req.path.startsWith("/decisions") ||
      _req.path.startsWith("/briefing") || _req.path.startsWith("/events") ||
      _req.path.startsWith("/waiters") || _req.path.startsWith("/health")) {
    return next();
  }
  res.sendFile(path.join(dashboardPath, "index.html"), (err) => {
    if (err) next();
  });
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
