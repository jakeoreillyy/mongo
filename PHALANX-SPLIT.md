# Phalanx - 4 person split

Deadline 16:00. Feature freeze 15:15. Submit by 15:45.

## Step 0: agree this contract first (5 minutes, everyone)

Everyone builds against this so nobody waits on anyone else.
Suggested stack: Node + TypeScript (the MCP SDK is TS-first). One repo, one Express server.

### HTTP API (owned by A and C, one server)

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/claims` | `{ teamId, resource, agentId, task, ttlSeconds }` | 201 `{ status: "claimed", expiresAt }` or 409 `{ status: "blocked", heldBy, task, expiresAt }` |
| DELETE | `/claims/:resource` | `?teamId&agentId` | 200 `{ status: "released" }` or 404 |
| GET | `/claims` | `?teamId` | `[claim]` (expired ones filtered out) |
| POST | `/decisions` | `{ teamId, module, agentId, text }` | 201 `{ id }` |
| GET | `/briefing` | `?teamId&module` (module optional) | `{ claims: [...], decisions: [...] }` |
| GET | `/events` | `?teamId` | Server-sent events: `{ type: "claimed" \| "released" \| "blocked" \| "decision", ...doc }` |

### Collections

- `claims`: `{ teamId, resource, agentId, task, createdAt, expiresAt }`
  - unique `{ teamId: 1, resource: 1 }`, TTL `{ expiresAt: 1 }` with `expireAfterSeconds: 0`
- `decisions`: `{ teamId, module, agentId, text, createdAt }`, index `{ teamId: 1, module: 1, createdAt: -1 }`
- `conflicts`: `{ teamId, resource, agentId, heldBy, createdAt }` (written on every 409, so blocks show in the change stream)

Team id for the demo: `demo`. Resources: `auth`, `payments`, `ui`, `db`.

---

## A: Data and claims

Owns the cluster, the indexes and the claim logic. The heart of the demo.

1. Create the Atlas cluster, add teammates and IP access, post the connection string in the team chat (not in the repo). **By 12:50.**
2. Create the collections and indexes above in a `setup` script that is safe to re-run.
3. Express server skeleton with `.env` / `.env.example`. Push it so C can add routes.
4. `POST /claims`:
   - Insert. On duplicate key error (code 11000), look up the holder.
   - **App-level expiry:** if the holder's `expiresAt` is already past, `findOneAndDelete({ teamId, resource, expiresAt: { $lt: now } })` and retry the insert once. This avoids waiting up to a minute for the TTL monitor.
   - Otherwise write a `conflicts` doc and return 409 with the holder.
5. `DELETE /claims/:resource` (only the holder can release) and `GET /claims`.
6. Seed script: resets team `demo` to a clean state. Needed for repeatable demos.

**Done when:** two curl calls claiming `auth` return 201 then 409, every time.

## B: MCP server and demo agents

1. Start immediately against a stub (hardcoded responses) so you are not blocked on A.
2. MCP server with tools `claim_resource`, `release_resource`, `record_decision`, `get_briefing`, `list_claims`. Each tool is a thin call to the HTTP API. Tool descriptions matter: they tell the agent to claim before editing and to read the briefing first.
3. Test it in one real client (Claude Code or Claude Desktop). **One tool call working by 13:30.**
4. **Scripted demo agents** (this is the live demo, not real LLMs): a script that runs Agent 1 and Agent 2 in a fixed order with short pauses:
   - Agent 1 claims `auth`, Agent 2 claims `payments`
   - Agent 2 tries `auth` and gets blocked, then takes `ui` instead
   - Agent 1 records a decision ("auth uses JWT, not sessions") and releases `auth`
   - Agent 3 joins and calls `get_briefing`
5. If time: one real agent run through MCP, recorded for the backup video.

**Done when:** the demo script runs end to end against the real API, twice in a row after reseeding.

## C: Live events, decisions and briefing

1. Add routes to A's server once it is pushed (stub in a separate file until then).
2. `POST /decisions`.
3. `GET /briefing`: active claims (`expiresAt > now`) plus the last 10 decisions for the team and module. Keep the aggregation readable, it goes on screen in the demo.
4. `GET /events`: open a change stream on `claims`, `decisions` and `conflicts` filtered by `teamId`, push each change out as server-sent events. Map inserts and deletes to `claimed` / `released` / `blocked` / `decision`.
5. Ask the MongoDB engineers about change stream limits on the free tier early.

**Done when:** a claim made with curl shows up in `curl -N /events` within a second.

## D: Dashboard, story and submission

1. Single page dashboard. Start against mock JSON in the contract shape, switch to the real `/events` when C is ready.
   - Columns: agents, active claims (with countdown to expiry), live feed of conflicts and decisions.
   - The **blocked** event must be impossible to miss (red flash or banner). It is the money shot.
2. Briefing panel: shows the `/briefing` result when Agent 3 joins.
3. README: problem, how to run, architecture, a "MongoDB feature / job it does" table (unique index, TTL, change streams, flexible documents, aggregation).
4. Demo script (3 minutes, from the plan) and the answer to "how is this different from Substrate?"
5. Backup screen recording by 15:40. Submit by 15:45.

**Done when:** the dashboard reacts live to B's demo script.

---

## Checkpoints (2 minutes each, standing up)

| Time | Must be true |
|---|---|
| 13:00 | Cluster live, server skeleton pushed, contract agreed, everyone building against it |
| 13:30 (lunch) | Claim/conflict works via curl. MCP answers one tool call. Dashboard renders mock data |
| 14:30 | Change stream feeding the dashboard. Briefing works. Demo script runs end to end |
| 15:15 | **Feature freeze.** Only bug fixes, polish and the recording from here |
| 15:45 | Submitted |

## Dependencies to watch

- B and D are blocked by nothing: stubs and mocks until 13:30.
- C needs A's server pushed (target 13:00). If late, C builds routes in a separate router file and merges later.
- The whole demo needs A's 409 path. If A is stuck at 13:30, B helps A.
