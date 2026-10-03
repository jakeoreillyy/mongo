// C's router: /decisions, /briefing, /events, /waiters.
// A's server does app.use(express.json()); app.use(cRouter); and calls startChangeStreams(db) once.
import { Router } from "express";
import decisions from "./decisions.js";
import briefing from "./briefing.js";
import events from "./events.js";
import waiters from "./waiters.js";

const router = Router();
router.use(decisions, briefing, events, waiters);

export default router;
