# Official MongoDB MCP server (demo closer)

Owner: B. Status: **done** — registered and verified read-only against the
real cluster on 2026-10-03. This is the optional item from
`PHALANX-SPLIT.md`: "connect the official MongoDB MCP server and ask Claude
'who's blocked right now?' straight against Atlas."

## Current setup

- Teammate A created a dedicated `team-readonly` database user, scoped to the
  `phalanx` database only. Verified empirically via
  `db.runCommand({connectionStatus:1, showPrivileges:true})` before trusting
  it: `authenticatedUserRoles` came back as exactly `{"role":"read","db":"phalanx"}`
  — no write, no admin.
- Real collections confirmed live on the cluster: `claims`, `conflicts`,
  `decisions`, `waiters`, `_resume` — matches the data model in
  `plan-phalanx.md` and `PHALANX-SPLIT.md`, including C's resume-token work.
- Registered as a second MCP server, `mongodb-atlas`, via
  `claude mcp add mongodb-atlas -s local -e MDB_MCP_CONNECTION_STRING=... -e MDB_MCP_READ_ONLY=true -- npx -y mongodb-mcp-server@latest --readOnly`.
  **`-s local` scope on purpose** — this stores the connection string in the
  per-user `~/.claude.json`, never in the repo's committed `.mcp.json`, so
  nothing ends up in git. Confirmed `git status` stayed clean after adding it.
- Each teammate who wants to use it needs to run the same `claude mcp add`
  command themselves with their own copy of the `team-readonly` credentials —
  it is intentionally not shared via the repo.
- To use it: open a **new** Claude Code session in the repo (an already-open
  session won't see a server added after it started) and ask natural-language
  questions, e.g. "what's in the claims collection for team demo?" or "who's
  holding auth right now?".

## What it is

MongoDB publishes its own MCP server (`mongodb-js/mongodb-mcp-server` on
GitHub, `mongodb-mcp-server` on npm). It's a stdio MCP server, same transport
our own `phalanx` server uses, but general-purpose: it connects straight to a
MongoDB deployment via a connection string and exposes tools like
`list-databases`, `list-collections`, `collection-schema`,
`collection-indexes`, `find`, `aggregate`, `count`, and (unless restricted)
write/admin tools such as `insert-many`, `update-many`, `delete-many`,
`drop-collection`. Given Atlas Admin API credentials it can also expose
cluster/project management tools, which we have no use for here.

Confirmed against the current README (2026-10-03): connection string via the
`MDB_MCP_CONNECTION_STRING` env var or a positional CLI argument; read-only
via the `--readOnly` flag or `MDB_MCP_READ_ONLY` env var. We pass both the
flag and the env var, and the database role is also read-only, so it's
enforced in three independent places.

## Why we want it

It's a live, unscripted closer: ask Claude a natural-language question
("who's blocked right now?", "show the most recent decisions") and it runs
the query against the real Atlas cluster on the spot — proof that this isn't
just our bespoke API wrapping the data, Mongo itself is directly queryable.
It's explicitly B's item, not A's, C's, or D's.

## Why it won't conflict with the team

- **No shared code.** It's a second, independent entry in `.mcp.json`
  alongside our own `phalanx` server. It never imports or calls anything in
  `mcp-server/src/`.
- **No shared path through the app.** It talks to MongoDB directly, not
  through A's Express API, so it never touches A's claim logic, C's
  change-stream/event code, or D's dashboard.
- **No schema/index changes.** It's a read client. It doesn't create
  collections, indexes, or validators — all of that stays A's.
- **Read-only, scoped credentials.** Run it with the read-only flag (or
  equivalent config — check the current README) and connect with a database
  user that only has read access, scoped to the `phalanx` database. That
  means even a bad natural-language instruction mid-demo can't write to or
  drop anything A/C built.

## What we needed from A (done)

- [x] Atlas cluster live
- [x] A dedicated **read-only** database user (`team-readonly`) scoped to the
      `phalanx` database — not the app's own credentials
- [x] The resulting read-only connection string, verified empirically rather
      than taken on trust (see Current setup above)

This only needed the cluster and collections to exist, not A's Express API
server finished — it was wired up in parallel with the rest of A's work.

## Setup steps (for any teammate who wants to use this themselves)

1. Get the `team-readonly` credentials from A (not committed anywhere).
2. Register it locally — **not** project scope, so the credentials never hit
   git:
   ```
   claude mcp add mongodb-atlas -s local \
     -e MDB_MCP_CONNECTION_STRING="mongodb+srv://team-readonly:<password>@cluster0.vmjdx6i.mongodb.net/phalanx?appName=Cluster0" \
     -e MDB_MCP_READ_ONLY=true \
     -- npx -y mongodb-mcp-server@latest --readOnly
   ```
3. Open a **new** Claude Code session in the repo (a session started before
   you ran step 2 won't see it) and ask it things directly, e.g. "what's in
   the claims collection for team demo?" or "who's holding auth right now?".
4. Still to do: slot it into the demo script's "Why MongoDB" closing beat
   (ask it live, don't pre-script the output) and record a backup video of
   it working, same as the rest of the demo.

## Risks / fallbacks

- This is still optional — the core demo (claim/conflict/decision/briefing)
  never depended on it, so if it misbehaves on the day, drop it from the
  script rather than debug live.
- If `npx` install is slow or flaky on the day, pre-install/cache it earlier
  rather than relying on the network during judging.
- Atlas Network Access needs the presenting device's IP allowed ahead of
  time — confirm this on venue Wi-Fi before judging, not just on whatever
  network it was first tested on.
- Keep it read-only, no exceptions — a live MCP server with write access
  during a demo is a real risk: one bad instruction could mutate the
  collections A and C built right before judging.
