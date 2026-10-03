import "dotenv/config";
import express from "express";
import { connectDb } from "./db";
import { claimsRouter } from "./routes/claims";

const app = express();
app.use(express.json());

app.use("/claims", claimsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = parseInt(process.env.PORT || "3000", 10);

async function start() {
  await connectDb();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Phalanx server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});

export { app };
