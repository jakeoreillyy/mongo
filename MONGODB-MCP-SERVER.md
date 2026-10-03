# Official MongoDB MCP server (demo closer)

Owner: B. Status: planned, blocked on A's Atlas connection details. This is the
optional item from `PHALANX-SPLIT.md`: "connect the official MongoDB MCP
server and ask Claude 'who's blocked right now?' straight against Atlas."

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

**Verify exact package name and CLI flags against the current README before
the demo** — this writeup is accurate as of today's plan but the package is
actively developed and flags can change.

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

## What we need from A (small ask, not a code change)

- [ ] Atlas cluster is live (true from early in the day regardless of this)
- [ ] A dedicated **read-only** database user scoped to the demo database —
      not the app's own credentials
- [ ] The resulting read-only connection string

This only needs the cluster and collections to exist. It does **not** need
A's Express API server to be finished, so it can be wired up in parallel with
the rest of A's work, not strictly after it.

## Implementation plan

1. Run it via `npx`, no need to add it as a project dependency:
   ```
   npx -y mongodb-mcp-server@latest --connectionString "<read-only-uri>" --readOnly
   ```
2. **Do not commit the connection string.** Register it with
   `claude mcp add mongodb-atlas -s local -e MDB_MCP_CONNECTION_STRING=... -- npx -y mongodb-mcp-server@latest --readOnly`
   using `-s local` (stored per-user, never written into the repo's
   `.mcp.json`) — same "keep credentials out of the repo" rule the plan
   already sets for `.env`. If the server reads the connection string from an
   env var instead of a flag, put it in `mcp-server/.env` (already gitignored)
   and reference it the same way.
3. Smoke-test with a few read-only questions against seeded demo data ("list
   the collections", "find all claims for team demo", "who holds auth right
   now") in a real Claude Code/Desktop session — the same style of check we
   already did for the `phalanx` server (`mcp-server/src/mcp-client-check.ts`
   / `npm run mcp:check`), before relying on it live.
4. Slot it into the demo script's "Why MongoDB" beat as the closing moment —
   ask it live in front of judges, don't pre-script the exact output.
5. Record a backup video of this step working, same as the rest of the demo.

## Risks / fallbacks

- If A's cluster/read-only user isn't ready in time, this item simply doesn't
  happen — it's optional, and the core demo (claim/conflict/decision/
  briefing) doesn't depend on it.
- If `npx` install is slow or flaky on the day, pre-install/cache it earlier
  rather than relying on the network during judging.
- Keep it read-only, no exceptions — a live MCP server with write access
  during a demo is a real risk: one bad instruction could mutate the
  collections A and C built right before judging.
