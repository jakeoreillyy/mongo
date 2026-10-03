// GET /events?teamId   (server-sent events)
// Each message: id = event id, data = { type, teamId, ...doc }.
// Reconnect with the Last-Event-ID header (EventSource does this itself) to replay missed events.
import { Router } from "express";
import { subscribe, eventsSince, PhalanxEvent } from "../../lib/changeStreams.js";

const router = Router();

router.get("/events", (req, res) => {
  const teamId = String(req.query.teamId ?? "");
  if (!teamId) return res.status(400).json({ error: "teamId is required" });

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  // Replay and subscribe run in the same tick, so no event can land between them.
  // The id goes on the SSE id line only, so it can't be mistaken for a decision's id in the payload.
  const send = ({ id, ...data }: PhalanxEvent) => res.write(`id: ${id}\ndata: ${JSON.stringify(data)}\n\n`);
  const lastEventId = req.get("Last-Event-ID");
  if (lastEventId) eventsSince(teamId, lastEventId).forEach(send);
  const unsubscribe = subscribe(teamId, send);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15000);
  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export default router;
