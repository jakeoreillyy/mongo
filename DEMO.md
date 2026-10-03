# Demo script (3 minutes)

Two screens ready before you start:

1. The landing page at `http://localhost:5173` (or `?live` once the API is up), scrolled to the top.
2. The dashboard at `?view=dashboard&live`, plus a terminal ready to run B's demo agents.

Reseed team `demo` before every run.

## 0:00 to 0:20, the problem

> "A hackathon team is four people, each running a few agents, all on one repo. They overwrite each other's work, contradict each other's decisions, and anyone joining late has no idea what's going on. And the first hour goes on making the repo and the group chat."

Show the hero headline: **Air traffic control for your team's agents.**

## 0:20 to 0:40, setup

Scroll to Setup. Click **Set up team**.

> "One click. In the real product the team lead signs in with GitHub, and we create the repo, invite everyone, open the Discord channel and hand every agent its config. Teammates don't make an account."

(Be honest if asked: this part is simulated today. The coordination is real.)

## 0:40 to 1:40, the agents (the money shot)

Switch to the dashboard and start B's demo agents.

1. **Claim.** agent-1 claims `auth`, agent-2 claims `payments`.
   > "Before touching code, every agent claims the module."
2. **Block.** agent-2 tries `auth`.
   > "Second claim on the same module. MongoDB's unique index rejects it. That E11000 duplicate key error *is* our conflict signal. No locks in app code, no race."
3. **Wait.** agent-2 waits in line.
   > "Instead of guessing, it waits."
4. **Warn.** agent-3 claims `login-flow`.
   > "Different name, same area. Atlas Vector Search spots it and gives a heads-up. The unique index is the guarantee, Vector Search is the hint."

## 1:40 to 2:20, hand off and brief

5. **Decide and release.** agent-1 records "Auth uses JWT, not sessions" and releases `auth`.
6. **Woken.** agent-2 is woken instantly.
   > "A change stream sees the release and wakes the waiting agent. No polling."
7. **Brief.** A fresh agent joins and calls `get_briefing`.
   > "One aggregation, and it knows every claim and every decision."

## 2:20 to 2:50, why MongoDB

> "All of this is one Atlas cluster. Unique index for the guarantee, Vector Search for the hint, change streams for the wake-up, TTL so a crashed agent never locks anything, schema validation so bad data is refused. No Redis, no broker, no second database."

## 2:50 to 3:00, close

> "Next: real GitHub and Discord setup, and claims at file level, not just module level. Phalanx: build together, never collide."

---

# Answers to likely questions

**How is this different from Substrate?**
Substrate-style tools are shared memory: a place agents write context. Phalanx is coordination: it *enforces* who holds what. The centrepiece is the database rejecting a second claim, plus waiting, wake-up and similarity warnings. Shared memory tells you what happened; Phalanx stops the collision before it happens.

**Why only MongoDB? Couldn't Postgres do this?**
Postgres can do the unique constraint and `LISTEN/NOTIFY`. But the semantic match needs a vector store, the wake-up needs a reliable change feed with resume, and expiry needs a job. That's three or four systems to keep in sync. In Atlas it's one cluster: unique index, Vector Search, change streams with resume tokens, TTL and schema validation.

**What if an agent crashes while holding a claim?**
Every claim has an `expiresAt`. A TTL index removes it, and the API also checks expiry on claim, because the TTL monitor only runs about once a minute.

**`auth` vs `auth/login` would not conflict, right?**
Correct, the unique index only catches exact matches. That's why Vector Search is there: it warns on overlap without blocking. Claims are kept at module level on purpose.

**How do teams stay separate?**
Every query and every change stream is scoped by `teamId`, and the Vector Search index uses `teamId` as a pre-filter.

**One challenge we hit:** _fill in on the day (for example, change stream deletes only carrying `_id`, or tuning the similarity threshold)._

**What we'd improve:** real GitHub, Discord and Slack integrations; file-level claims; decision lineage with `$graphLookup` on screen.
