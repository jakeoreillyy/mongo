# Phalanx: swarm coordination for agents

Plan for MongoDB Student Builder Day, Sat 3 Oct 2026, Baseline, Dublin.
Submission deadline 16:00. Selected demos 16:15, about 3 minutes each.

## One-liner

Phalanx is a shared coordination layer for teams of AI agents, exposed as an MCP server backed by MongoDB. Agents claim what they're working on, get blocked when someone else already holds it, record decisions, and brief any new agent or teammate instantly.

## Problem

When several agents (and people) work on one codebase, they collide: two agents edit the same module, decisions get contradicted, and a newcomer has no idea what's going on. The context that matters lives between commits and never makes it into GitHub or Slack.

## Scope

**Design rule: one MongoDB Atlas cluster is the whole backend.** No Redis, no pub/sub broker, no separate vector database, no search service. Every feature below runs inside Atlas, and each one solves a problem Phalanx actually has.

**Must have (the demo)**
- MCP server with tools: `claim_resource`, `release_resource`, `record_decision`, `get_briefing`, `list_claims`, `wait_for_resource`.
- Claims enforced by MongoDB: a unique index blocks a second claim, a TTL index expires abandoned claims.
- **Soft conflicts via Atlas Vector Search:** a claim that is semantically close to a held claim (`login-flow` vs `auth`) is allowed but returns a `similarTo` warning. This fixes the exact-match limit of the unique index.
- **Waitlist via change streams:** a blocked agent subscribes to the release of that resource and is woken when it frees, instead of just being redirected.
- **Schema validation (`$jsonSchema`)** on all collections, so the database rejects malformed claims and decisions.
- Live dashboard showing agents, claims, conflicts, warnings and waiting agents, updated via change streams, resumable after a disconnect.
- Onboarding briefing: a new agent or person asks "what's going on?" and gets active claims plus recent decisions.
- At least two real agents using it in the demo.

**Nice to have (only if the must-haves work by 15:00)**
- Decision lineage: decisions supersede earlier ones, and `$graphLookup` walks the chain ("why do we use JWT?").
- Official MongoDB MCP server as a demo closer: ask Claude "who's blocked right now?" straight against Atlas.
- Hoplite credits used to run extra agents (see risks).

**Cut list (do not build)**
- Auth, per-user permissions beyond a team id, complex dependency graphs, a polished product site.

## Why MongoDB (map to judging)

| Feature | Job it does here | Demo moment |
|---|---|---|
| Unique index | Atomically stops two agents claiming the same resource. The duplicate key error is the conflict signal. | Two agents claim the same module, one is blocked live. |
| TTL index | Claims expire if an agent dies or forgets to release. | Show a claim expiring (see caveat below). |
| **Atlas Vector Search** (`$vectorSearch`, pre-filtered by `teamId`) | Catches overlap the unique index can't: different wording for the same area of work. | Agent claims `login-flow` and gets a soft warning against `auth`. |
| **Change streams + resume tokens** | Dashboard sees events live. Blocked agents are woken when the holder releases. A reconnecting client resumes without missing events. | Holder releases, the waiting agent proceeds with no polling. |
| **Schema validation** | The database itself rejects malformed claims, decisions and conflicts. | Insert a bad claim in Compass, it is refused. |
| Flexible documents | Claims, decisions, conflicts and warnings all have different fields in one store. | Show the collections in Atlas/Compass. |
| Scoped queries and aggregation | Briefing for one team and module, built from claims plus recent decisions. | New agent gets briefed in one call. |
| `$graphLookup` (optional) | Walks the `supersedes` chain to show why a decision stands. | "Why JWT?" returns the chain of decisions. |
| MongoDB MCP server (optional) | Lets any agent query Atlas directly in natural language. | Ask Claude "who's blocked right now?". |

**Why only MongoDB:** the atomic claim, the semantic match, the live wake-up and the decision history all run in one Atlas cluster. Doing this elsewhere would take a relational DB, a pub/sub broker, a vector database and a TTL job, each to keep in sync. If asked about Postgres: it can do the unique constraint and `LISTEN/NOTIFY`, but the vector search and the change feed would be separate pieces to run and keep consistent.

## Data model

**claims**
```
{
  _id, teamId, resource,      // resource is a module-level name, e.g. "auth"
  agentId, owner, task,
  createdAt, expiresAt,
  embedding       // vector of "resource + task", for soft-conflict matching
}
```
Indexes:
- Unique: `{ teamId: 1, resource: 1 }`
- TTL: `{ expiresAt: 1 }` with `expireAfterSeconds: 0`
- Atlas Vector Search index on `embedding`, with `teamId` as a filter field

**waiters** (agents waiting on a held resource)
```
{ _id, teamId, resource, agentId, createdAt }
```
Resolved by a change stream: a delete on `claims` for that resource wakes the oldest waiter.

All collections get a `$jsonSchema` validator (required fields and types). Set it up in the same `setup` script as the indexes.

**decisions**
```
{
  _id, teamId, module, text,
  agentId, createdAt,
  supersedes,     // optional id of an earlier decision, walked with $graphLookup
  embedding       // for Vector Search
}
```
Index: `{ teamId: 1, module: 1, createdAt: -1 }`

**agents**
```
{ _id, teamId, name, owner, lastSeen, status }
```

Every query includes `teamId`. That is the scoping story: one team's agents never see another team's context.

## How a conflict works

1. Agent calls `claim_resource("auth")`.
2. Server inserts into `claims`.
3. If the insert succeeds, return "claimed".
4. If MongoDB returns a duplicate key error, look up the current holder and return "blocked, held by agent X for task Y". The agent can pick other work, or call `wait_for_resource` to be woken on release (a `waiters` doc, resolved by the change stream).
5. If the insert succeeds, run `$vectorSearch` on `claims` (filtered to the team). If a held claim is similar above a threshold, return "claimed" plus `similarTo` as a soft warning. Emit a `warning` event.
6. A change stream on `claims`, `decisions` and `conflicts` pushes events to the dashboard. The server stores the latest resume token so a reconnecting client misses nothing.

Caveats to know before the demo:
- **TTL is not instant.** MongoDB's background TTL task runs about once a minute, so expiry can lag. For the demo, also check `expiresAt` in application logic, or show expiry with a short duration and wait.
- **Unique index only catches exact matches.** `auth` and `auth/login` would not hard-conflict. Vector Search covers this as a warning, not a block. Say so: the unique index is the guarantee, Vector Search is the hint.
- **Change streams need a replica set.** Atlas provides this, including the free tier.
- **Vector similarity needs a threshold.** Tune it on the demo data so `login-flow` warns against `auth` but `ui` does not.
- **Embeddings:** if automated embedding is not available on the free tier, generate them yourself, match the index dimensions to the model, and use the same model for stored and query text.

## Briefing aggregation (sketch, adapt it)

Return active claims and recent decisions for a team and module:
```
db.decisions.aggregate([
  { $match: { teamId, module } },
  { $sort: { createdAt: -1 } },
  { $limit: 10 },
  { $project: { text: 1, agentId: 1, createdAt: 1 } }
])
```
Combine with a `find` on `claims` (or `$facet` / `$lookup` if you want it in one query). Keep it readable; judges should be able to follow it in 30 seconds.

Optional decision lineage, following `supersedes` back through earlier decisions:
```
db.decisions.aggregate([
  { $match: { _id: decisionId } },
  { $graphLookup: {
      from: "decisions", startWith: "$supersedes",
      connectFromField: "supersedes", connectToField: "_id",
      as: "history" } }
])
```

## Team split

| Person | Owns | Done when |
|---|---|---|
| A: Data | Atlas cluster, collections, unique and TTL indexes, scoping by teamId, seed data. **Plus:** `$jsonSchema` validators, `embedding` field and Vector Search index, soft-conflict check in `POST /claims`. | Duplicate claim reliably returns a conflict; `login-flow` warns against `auth`. |
| B: MCP server | Tools: claim, release, record decision, get briefing, list claims. Test with a real agent client. **Plus:** `wait_for_resource` tool, tool descriptions covering warnings and waiting, demo beat for the soft warning, optional MongoDB MCP server closer. | An agent can call every tool, including waiting. |
| C: Live and briefing | Change streams, event feed, briefing query. **Plus:** waitlist wake-up on release, resume tokens for `/events`, optional `$graphLookup` lineage. | Events arrive live and survive a reconnect; a waiting agent is woken on release. |
| D: Dashboard and demo | Web dashboard (agents, claims, conflicts, decisions). Demo script and scenario. Repo and submission. **Plus:** soft-warning and waiting states on the dashboard, README rows for the new features, the "why only MongoDB" answer. | Demo runs end to end with two agents. |

If A is stretched, move the vector index and soft-conflict check to C.

Contract additions to agree in the first hour: `POST /claims` 201 may include `similarTo`; `/events` gains a `warning` type and a `waiting` type; a `wait_for_resource` call (endpoint name to be agreed).

Everyone: commit to the shared Git repo from the first hour. Keep credentials out of the repo (use a `.env` file and a `.env.example`).

## Timeline

| Time | Goal |
|---|---|
| 11:30 to 12:15 | Welcome, starter templates, pick the stack, create repo and free Atlas cluster, agree data model and tool names. |
| 12:15 to 13:00 | Skeleton: claim and release working against MongoDB, MCP server answering a test call. |
| 13:00 to 13:30 | Lunch. Talk through blockers while eating. |
| 13:30 to 14:30 | Conflict path working, change stream feeding the dashboard, record_decision and briefing working. |
| 14:30 to 15:15 | Run two real agents against it. Seed demo data. Test the demo path and one hard case (agent dies, claim expires). |
| 15:15 to 15:45 | Freeze features. Polish dashboard, record a backup demo, write README. |
| 15:45 | Submit. Buffer for platform problems before 16:00. |

## Demo script (3 minutes)

1. **Problem (20s):** agents and teammates collide, and newcomers can't see what's happening.
2. **Two agents start (30s):** each claims a module, visible live on the dashboard.
3. **Conflict (45s):** a second agent tries to take a claimed module, gets blocked and told to wait. Show the duplicate key behaviour and the change stream event. Then a soft warning: another agent claims `login-flow` and is told it is close to `auth` (Vector Search).
4. **Release, decision and briefing (45s):** Agent 1 releases `auth`, the waiting agent is woken by the change stream. Record a decision, then bring in a fresh agent that asks for a briefing and gets claims plus decisions instantly.
5. **Why MongoDB (30s):** unique index for the guarantee, Vector Search for the hint, change streams for the wake-up, TTL for dead agents, schema validation, all in one cluster with no second system.
6. **Close (10s):** what we'd build next.

Be ready to explain one challenge we hit and what we'd improve.

## Risks and fallbacks

- **Looks like Substrate (a London finalist):** make claims and conflict-blocking the centrepiece, not generic shared memory.
- **MCP client setup is fiddly:** build the core as a plain HTTP API first, then wrap it as MCP. The demo works either way.
- **Hoplite access details arrive on the day:** do not depend on it. Make Phalanx work with any agent, then use Hoplite credits as a bonus for running more agents.
- **TTL timing makes the demo awkward:** see caveat above, use app-level expiry check.
- **Vector Search eats time:** it is now part of the demo, so do it early (target working by 14:30). If automated embedding is unavailable, generate embeddings yourself. If it still fails by 14:30, cut to exact-match plus the waitlist and drop the soft-warning beat; do not let it block the core.
- **Soft warnings misfire:** tune the similarity threshold on the seeded demo data and test one case that should not warn.

## Questions for the MongoDB engineers

- Best pattern for an atomic claim: unique index and catching the duplicate key error, or a findOneAndUpdate upsert?
- Any gotchas with change streams on a free tier cluster?
- Quickest way to expose Atlas data to an MCP server (the official MongoDB MCP server)?
- Does automated embedding work on the free tier, and how do I filter `$vectorSearch` by `teamId`?
- Best way to store and reuse a change stream resume token?

## Submission checklist

- [ ] Repo public (or as required), no credentials committed
- [ ] README: problem, how to run, MongoDB features used and why (unique index, TTL, Vector Search, change streams, schema validation)
- [ ] Soft-warning and waitlist beats tested, plus one case that should not warn
- [ ] Demo data seeded and repeatable
- [ ] Demo path tested twice, plus one hard case
- [ ] Backup screen recording ready
- [ ] Submitted before 16:00
