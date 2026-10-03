// GET /events?teamId   (server-sent events)
// emits: { type: "claimed" | "released" | "blocked" | "decision", ...doc }

// TODO: validate teamId
// TODO: set SSE headers and flush
// TODO: subscribe to the shared change stream feed, filtered by teamId
// TODO: write each event as an SSE message
// TODO: heartbeat comment every ~15s so connections stay open
// TODO: unsubscribe on client disconnect
