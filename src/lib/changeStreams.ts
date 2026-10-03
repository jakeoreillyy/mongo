// One change stream per collection, shared by all SSE clients.

// TODO: open change streams on `claims`, `decisions`, `conflicts`
// TODO: map changes to event types:
//         claims insert    -> "claimed"
//         claims delete    -> "released"
//         conflicts insert -> "blocked"
//         decisions insert -> "decision"
// TODO: expose subscribe(teamId, handler) and an unsubscribe function
// TODO: reconnect or log if a stream errors
// TODO: close streams on shutdown
