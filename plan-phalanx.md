# Phalanx: swarm coordination for agents

Plan for MongoDB Student Builder Day, Sat 3 Oct 2026, Baseline, Dublin.
Submission deadline 16:00. Selected demos 16:15, about 3 minutes each.

## One-liner

Phalanx is a shared coordination layer for teams of AI agents, exposed as an MCP server backed by MongoDB. Agents claim what they're working on, get blocked when someone else already holds it, record decisions, and brief any new agent or teammate instantly.

## Problem

When several agents (and people) work on one codebase, they collide: two agents edit the same module, decisions get contradicted, and a newcomer has no idea what's going on. The context that matters lives between commits and never makes it into GitHub or Slack.

## Scope

**Must have (the demo)**
- MCP server with tools: `claim_resource`, `release_resource`, `record_decision`, `get_briefing`, `list_claims`.
- Claims enforced by MongoDB: a unique index blocks a second claim, a TTL index expires abandoned claims.
- Live dashboard showing agents, claims and conflicts, updated via change streams.
- Onboarding briefing: a new agent or person asks "what's going on?" and gets active claims plus recent decisions.
- At least two real agents using it in the demo.

**Nice to have (only if the must-haves work by 15:00)**
- Vector Search so "who's working on something related?" works across different wording.
- Decisions that supersede earlier decisions.
- Hoplite credits used to run extra agents (see risks).

**Cut list (do not build)**
- Auth, per-user permissions beyond a team id, complex dependency graphs, a polished product site.

## Why MongoDB (map to judging)

| Feature | Job it does here | Demo moment |
|---|---|---|
| Unique index | Atomically stops two agents claiming the same resource. The duplicate key error is the conflict signal. | Two agents claim the same module, one is blocked live. |
| TTL index | Claims expire if an agent dies or forgets to release. | Show a claim expiring (see caveat below). |
| Change streams | Dashboard and agents see claims, conflicts and decisions as they happen. | Live conflict appears on screen. |
| Flexible documents | Claims, decisions, open questions all have different fields. | Show the collections in Atlas/Compass. |
| Scoped queries and aggregation | Briefing for one team and module, built from claims plus recent decisions. | New agent gets briefed in one call. |

Honest tradeoff to say out loud if asked: Postgres plus a pub/sub layer could do this. The argument for MongoDB is one store giving flexible documents, live change notifications, TTL and search together.

## Data model

**claims**
```
{
  _id, teamId, resource,      // resource is a module-level name, e.g. "auth"
  agentId, owner, task,
  createdAt, expiresAt
}
```
Indexes:
- Unique: `{ teamId: 1, resource: 1 }`
- TTL: `{ expiresAt: 1 }` with `expireAfterSeconds: 0`

**decisions**
```
{
  _id, teamId, module, text,
  agentId, createdAt,
  supersedes,     // optional id of an earlier decision
  embedding       // optional, only if Vector Search is used
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
4. If MongoDB returns a duplicate key error, look up the current holder and return "blocked, held by agent X for task Y". The agent can pick other work.
5. A change stream on `claims` and `decisions` pushes the event to the dashboard.

Caveats to know before the demo:
- **TTL is not instant.** MongoDB's background TTL task runs about once a minute, so expiry can lag. For the demo, also check `expiresAt` in application logic, or show expiry with a short duration and wait.
- **Unique index only catches exact matches.** `auth` and `auth/login` would not conflict. Keep claims at module level and say so.
- **Change streams need a replica set.** Atlas provides this, including the free tier.

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

## Team split

| Person | Owns | Done when |
|---|---|---|
| A: Data | Atlas cluster, collections, unique and TTL indexes, scoping by teamId, seed data. | Duplicate claim reliably returns a conflict. |
| B: MCP server | Tools: claim, release, record decision, get briefing, list claims. Test with a real agent client. | An agent can call every tool. |
| C: Live and briefing | Change streams, event feed, briefing query, optional Vector Search. | Conflict and decision events arrive live; briefing returns useful output. |
| D: Dashboard and demo | Web dashboard (agents, claims, conflicts, decisions). Demo script and scenario. Repo and submission. | Demo runs end to end with two agents. |

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
3. **Conflict (45s):** a second agent tries to take a claimed module, gets blocked and redirected. Show the duplicate key behaviour and the change stream event.
4. **Decision and briefing (45s):** record a decision, then bring in a fresh agent that asks for a briefing and gets claims plus decisions instantly.
5. **Why MongoDB (30s):** unique index, TTL, change streams, flexible documents, one database.
6. **Close (10s):** what we'd build next.

Be ready to explain one challenge we hit and what we'd improve.

## Risks and fallbacks

- **Looks like Substrate (a London finalist):** make claims and conflict-blocking the centrepiece, not generic shared memory.
- **MCP client setup is fiddly:** build the core as a plain HTTP API first, then wrap it as MCP. The demo works either way.
- **Hoplite access details arrive on the day:** do not depend on it. Make Phalanx work with any agent, then use Hoplite credits as a bonus for running more agents.
- **TTL timing makes the demo awkward:** see caveat above, use app-level expiry check.
- **Vector Search eats time:** it's optional. Skip it unless matching by meaning clearly helps.

## Questions for the MongoDB engineers

- Best pattern for an atomic claim: unique index and catching the duplicate key error, or a findOneAndUpdate upsert?
- Any gotchas with change streams on a free tier cluster?
- Quickest way to expose Atlas data to an MCP server?

## Submission checklist

- [ ] Repo public (or as required), no credentials committed
- [ ] README: problem, how to run, MongoDB features used and why
- [ ] Demo data seeded and repeatable
- [ ] Demo path tested twice, plus one hard case
- [ ] Backup screen recording ready
- [ ] Submitted before 16:00
