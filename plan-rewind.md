# Rewind: agent run debugger

Plan for MongoDB Student Builder Day, Sat 3 Oct 2026, Baseline, Dublin.
Submission deadline 16:00. Selected demos 16:15, about 3 minutes each.

## One-liner

Rewind logs every step an AI agent takes into MongoDB. When a run fails, it shows exactly where it diverged from a good run, and recalls similar past failures and the fix that worked.

## Problem

Agents fail in confusing ways. Developers can't see which step went wrong, what changed between a good run and a bad one, or whether they've hit this failure before.

## Scope

**Must have (the demo)**
- Tiny logging SDK that records a run and its steps into MongoDB.
- Run timeline view in a web UI.
- "Diff two runs" using an aggregation pipeline, highlighting the first step where they diverge.
- Failure memory: when a run fails, store a failure record with an embedding. Next time a similar failure appears, Vector Search surfaces past matches and their fix.
- One demo agent that we can break on purpose.

**Nice to have (only if the must-haves work by 15:00)**
- LLM-written explanation of the divergence.
- Filter failures by project.
- Dogfooding: log our own coding agent during the day.

**Cut list (do not build)**
- Auth, multi-tenant accounts, pretty landing page, support for many agent frameworks.

## Why MongoDB (map to judging)

| Feature | Job it does here | Demo moment |
|---|---|---|
| Documents with embedded steps | A run is one document holding its ordered steps. Steps differ in shape (prompt, tool call, tool result, error). | Show a run document in Atlas/Compass. |
| Aggregation pipeline | Diffs two runs step by step and finds the first divergence. | Click "Diff", show the pipeline in 30 seconds. |
| Vector Search | Finds similar past failures and their fixes. | Second failure is recognised instantly. |
| Indexes | Fast lookup by project, status, time. | Mention briefly, don't dwell. |

Honest tradeoff to say out loud if asked: this could be done in Postgres, but variable-shape steps, nested step arrays, and vector search sit together in one store here.

## Data model

**runs**
```
{
  _id, project, agent, task,
  status: "success" | "failed",
  startedAt, endedAt,
  steps: [
    { idx, type: "prompt"|"tool_call"|"tool_result"|"error",
      name, input, output, ts, durationMs }
  ]
}
```
Indexes: `{ project: 1, startedAt: -1 }`, `{ status: 1 }`.
If steps get large, move them to a separate `steps` collection keyed by runId. For the hackathon, embedded is fine and simpler.

**failures**
```
{
  _id, runId, project,
  signature,        // e.g. error text + last tool name
  summary,          // short human-readable description
  fix,              // filled in once someone resolves it
  embedding,        // vector of signature + summary
  createdAt
}
```
Vector Search index on `embedding`. Number of dimensions must match the embedding model. Use the same model for stored failures and for queries. If you add a project filter, include `project` as a filter field in the index definition. Check MongoDB's automated embedding docs for whether it can save setup time.

## Key aggregation (sketch, adapt it)

Find the first step where two runs differ:
```
db.runs.aggregate([
  { $match: { _id: { $in: [goodRunId, badRunId] } } },
  { $unwind: { path: "$steps", includeArrayIndex: "idx" } },
  { $group: { _id: "$idx",
      versions: { $push: { run: "$_id", name: "$steps.name", output: "$steps.output" } } } },
  { $match: { $expr: { $ne: [
      { $arrayElemAt: ["$versions.name", 0] },
      { $arrayElemAt: ["$versions.name", 1] } ] } } },
  { $sort: { _id: 1 } },
  { $limit: 1 }
])
```
Decide early whether "different" means different tool name, different output, or both, and keep it simple.

## Team split

| Person | Owns | Done when |
|---|---|---|
| A: SDK | Logging wrapper (`start_run`, `log_step`, `end_run`) writing to MongoDB. Demo agent with a deliberate failure mode. | Good and bad runs appear in the database. |
| B: Data and diff | Atlas cluster, collections, indexes, the diff aggregation, API endpoint for it. | Diff endpoint returns the divergence step. |
| C: Memory | Failures collection, embeddings, Vector Search index, "find similar" endpoint, optional LLM explanation. | Second similar failure returns the first one's fix. |
| D: UI and demo | Web UI: run list, timeline, diff view, similar failures panel. Demo data and demo script. Repo and submission. | Full flow clickable end to end. |

Everyone: commit to the shared Git repo from the first hour. Keep credentials out of the repo (use a `.env` file and a `.env.example`).

## Timeline

| Time | Goal |
|---|---|
| 11:30 to 12:15 | Welcome, grab starter templates, pick the stack, create repo and free Atlas cluster, agree data model. |
| 12:15 to 13:00 | Skeleton: SDK writes a run, API reads it, UI lists it. |
| 13:00 to 13:30 | Lunch. Talk through blockers while eating. |
| 13:30 to 14:30 | Diff aggregation working. Failures collection and vector index working. |
| 14:30 to 15:15 | Wire it all together. Seed demo data. Test the demo path and one hard case. |
| 15:15 to 15:45 | Freeze features. Polish UI, record a backup demo, write README. |
| 15:45 | Submit. Buffer for platform problems before 16:00. |

## Demo script (3 minutes)

1. **Problem (20s):** agents fail and nobody can see why.
2. **Run a good and a bad run (30s):** both appear in the timeline live.
3. **Diff (45s):** click Diff, show the first divergence, show the aggregation pipeline.
4. **Memory (45s):** trigger a new, similar failure. Rewind recalls the earlier one and its fix via Vector Search.
5. **Why MongoDB (30s):** flexible step documents, aggregation for diffing, Vector Search for memory, all in one database.
6. **Close (10s):** what we'd build next.

Be ready to explain one challenge we hit and what we'd improve.

## Risks and fallbacks

- **Vector Search setup eats time:** build the diff first. If vectors slip, fall back to text search on failure signatures and say so honestly.
- **Live LLM call fails in the demo:** pre-store the explanation for the demo failure.
- **Demo agent too complex:** keep it deterministic. Failure should be reproducible every time.
- **Abstract pain point for non-dev judges:** open the demo with a relatable failure ("the agent confidently did the wrong thing").

## Questions for the MongoDB engineers

- Best way to model steps: embedded array or separate collection, given runs could be long?
- Quickest way to set up Vector Search with embeddings today?
- Any gotchas with `$unwind` and `includeArrayIndex` on large arrays?

## Submission checklist

- [ ] Repo public (or as required), no credentials committed
- [ ] README: problem, how to run, MongoDB features used and why
- [ ] Demo data seeded and repeatable
- [ ] Demo path tested twice, plus one hard case
- [ ] Backup screen recording ready
- [ ] Submitted before 16:00
