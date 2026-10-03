# Phalanx

**Air traffic control for your team's agents.**

Phalanx is a coordination layer for teams of AI agents working on one codebase, exposed as an MCP server and backed by a single MongoDB Atlas cluster. Agents claim what they are working on, get blocked when someone already holds it, wait to be woken when it frees up, get a heads-up when their work overlaps someone else's, record decisions, and brief any new agent or teammate in one call.

Built at MongoDB Student Builder Day, Dublin, 3 October 2026.

## The problem

A hackathon team is four people each running several agents against one repo. Without coordination:

- **Agents overwrite each other.** Two agents pick up the same module and nobody finds out until the merge.
- **Decisions get contradicted.** One agent settles on JWT; another rebuilds sessions an hour later.
- **Newcomers start blind.** The context that matters lives between commits, not in GitHub or the group chat.
- **Setup eats the first hour.** Repo, group chat, chasing everyone's usernames.

## How it works

| Tool | What it does |
|---|---|
| `claim_resource` | Claim a module before editing it. If someone already holds it, the claim is rejected. |
| `wait_for_resource` | A blocked agent waits in line and is woken the moment the module is released. |
| `release_resource` | Release a claim when done. Claims also expire on their own if an agent dies. |
| `record_decision` | Save a decision where every other agent will see it. |
| `get_briefing` | Get every active claim and recent decision for the team in one call. |
| `list_claims` | See who holds what right now. |

A claim that goes through but is close in meaning to a held one (`login-flow` vs `auth`) returns a `similarTo` warning: a heads-up, not a block.

## Why MongoDB

**One Atlas cluster is the whole backend.** No Redis, no message broker, no separate vector database.

| MongoDB feature | Job it does in Phalanx |
|---|---|
| Unique index on `{ teamId, resource }` | The guarantee. Two claims on the same module cannot both succeed; the duplicate key error (E11000) is the conflict signal. |
| TTL index on `expiresAt` | Claims from crashed or forgetful agents expire on their own. |
| Atlas Vector Search (`$vectorSearch`, filtered by `teamId`) | The hint. Catches overlapping work under different names, which the unique index cannot. |
| Change streams + resume tokens | The wake-up. Pushes every claim, block and decision to the dashboard live, wakes waiting agents on release, and lets a reconnecting client resume without missing events. |
| Schema validation (`$jsonSchema`) | The database itself refuses malformed claims, decisions and conflicts. |
| Aggregation | Builds the briefing (active claims plus recent decisions) in one readable query. |
| Flexible documents | Claims, decisions, conflicts and waiters each have their own shape in one store. |
| `$graphLookup` (optional) | Walks the `supersedes` chain on decisions to answer "why do we use JWT?". |

Every query is scoped by `teamId`, so one team's agents never see another team's context.

## Architecture

```
agents (Claude Code, Cursor, ...)
        │  MCP
        ▼
  Phalanx MCP server ──HTTP──▶ Phalanx API (Express) ──▶ MongoDB Atlas
                                      │                    claims, decisions,
                                      │ SSE (/events)      conflicts, waiters
                                      ▼
                               dashboard (React)
```

The HTTP contract is in [`PHALANX-SPLIT.md`](PHALANX-SPLIT.md).

## Running it

**Dashboard and landing page:**

```sh
cd dashboard
npm install
npm run dev        # http://localhost:5173
```

It replays the demo script by default. Add `?live` to the URL to read from the API on port 4000 (change `API_TARGET` in `dashboard/.env` if it runs elsewhere). The detailed operator view is at `?view=dashboard`.

**MCP server and demo agents** (from `branch-b`, in `mcp-server/`):

```sh
cd mcp-server
npm install
npm run stub       # in-memory stand-in for the API on :4000, until A's server is live
npm run demo       # scripted demo agents
npm run mcp        # MCP server for Claude Code / Cursor
```

**API:** _to be filled in once A's server is merged._

Credentials live in `.env` files, which are git-ignored. Never commit them.

## Team

- A: data, Atlas cluster, claims and indexes
- B: MCP server and demo agents
- C: change streams, decisions and briefing
- D: dashboard, landing page, story and submission
