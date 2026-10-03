// One change stream for the whole db, shared by all SSE clients.
// Maps raw changes to contract events, hands freed resources to waiters, keeps a resume token.
import { Document, MongoServerError } from "mongodb";
import { getDb } from "./db";

export type PhalanxEvent = {
  id: string; // SSE event id; also the key for replay after a reconnect
  type: "claimed" | "released" | "blocked" | "warning" | "decision" | "waiting" | "woken";
  teamId: string;
  [k: string]: unknown;
};

type Handler = (event: PhalanxEvent) => void;

// "<collection>.<operation>" -> contract event type. Any other change is ignored.
// `warnings` mirrors `conflicts`: A writes one doc per soft conflict so it shows in the stream.
const EVENT_TYPES: Record<string, PhalanxEvent["type"]> = {
  "claims.insert": "claimed",
  "claims.delete": "released",
  "conflicts.insert": "blocked",
  "warnings.insert": "warning",
  "decisions.insert": "decision",
  "waiters.insert": "waiting",
};
const WATCHED = ["claims", "conflicts", "warnings", "decisions", "waiters"];
const BUFFER_SIZE = 500;
const TOKEN_DOC_ID = "events";
// InvalidResumeToken, ChangeStreamFatalError, ChangeStreamHistoryLost: the saved token can't be resumed.
const LOST_TOKEN_CODES = [260, 280, 286];
const HANDOFF_TTL_MS = 5 * 60_000; // same as B's stub

const handlers = new Set<{ teamId: string; handler: Handler }>();
const buffer: PhalanxEvent[] = []; // recent events, for Last-Event-ID replay
let queue: Promise<unknown> = Promise.resolve(); // changes are handled one at a time, in order

export function subscribe(teamId: string, handler: Handler): () => void {
  const sub = { teamId, handler };
  handlers.add(sub);
  return () => handlers.delete(sub);
}

// Events for this team after lastEventId. If the id has aged out of the buffer, replay all we have.
export function eventsSince(teamId: string, lastEventId: string): PhalanxEvent[] {
  const idx = buffer.findIndex((e) => e.id === lastEventId);
  return buffer.slice(idx + 1).filter((e) => e.teamId === teamId);
}

function publish(event: PhalanxEvent) {
  buffer.push(event);
  if (buffer.length > BUFFER_SIZE) buffer.shift();
  for (const { teamId, handler } of handlers) {
    if (teamId === event.teamId) handler(event);
  }
}

function clean(doc: Document): Document {
  const { embedding, ...rest } = doc;
  return rest;
}

const tokens = () => getDb().collection<{ _id: string; token: Document }>("_resume");

// Hand a free resource to its oldest waiter: B's wait_for_resource promises the claim, not just a wake-up.
// The unique index decides: if someone else holds it, the insert fails and the waiter stays queued for the next release.
async function handToOldestWaiter(teamId: string, resource: string, baseId: string) {
  const db = getDb();
  const waiter = await db.collection("waiters").findOne({ teamId, resource }, { sort: { createdAt: 1 } });
  if (!waiter) return;
  const claims = db.collection("claims");
  const now = new Date();
  // Clear an expired holder the TTL monitor hasn't reached yet, as POST /claims does.
  await claims.deleteOne({ teamId, resource, expiresAt: { $lte: now } });
  try {
    await claims.insertOne({
      teamId,
      resource,
      agentId: waiter.agentId,
      task: "woken from wait_for_resource",
      createdAt: now,
      expiresAt: new Date(now.getTime() + HANDOFF_TTL_MS),
    });
  } catch (err) {
    if ((err as MongoServerError).code === 11000) return;
    throw err;
  }
  await db.collection("waiters").deleteOne({ _id: waiter._id });
  publish({ ...clean(waiter), id: `${baseId}:woken`, type: "woken", teamId });
}

async function handleChange(change: Document) {
  const type = EVENT_TYPES[`${change.ns.coll}.${change.operationType}`];
  if (!type) return;
  // A delete only carries the old doc if pre-images are on (see startChangeStreams).
  const doc = change.operationType === "delete" ? change.fullDocumentBeforeChange : change.fullDocument;
  if (!doc) {
    console.warn("[changeStreams] claim deleted without a pre-image, so no `released`/`woken`; enable changeStreamPreAndPostImages on claims");
    return;
  }
  // A release handled before this insert may already have handed this waiter the resource.
  if (type === "waiting" && !(await getDb().collection("waiters").findOne({ _id: doc._id }))) return;
  const id: string = change._id._data;
  publish({ ...clean(doc), id, type, teamId: doc.teamId });

  // A release frees the resource. A new waiter may find it already free.
  if (type === "released" || type === "waiting") await handToOldestWaiter(doc.teamId, doc.resource, id);
}

async function open() {
  const token = (await tokens().findOne({ _id: TOKEN_DOC_ID }))?.token; // survive a restart without missing events
  const stream = getDb().watch(
    [{ $match: { "ns.coll": { $in: WATCHED }, operationType: { $in: ["insert", "delete"] } } }],
    { fullDocumentBeforeChange: "whenAvailable", ...(token && { startAfter: token }) },
  );
  stream.on("change", (change) => {
    queue = queue
      .then(() => handleChange(change))
      .then(() => tokens().updateOne({ _id: TOKEN_DOC_ID }, { $set: { token: change._id as Document } }, { upsert: true }))
      .catch((err) => console.error("[changeStreams] handling change failed", err));
  });
  stream.on("error", async (err) => {
    console.error("[changeStreams] stream error", err);
    await queue; // let in-flight changes save their tokens, so the reopen doesn't replay them
    // A token that fell off the oplog can't be resumed; drop it and start fresh.
    if (LOST_TOKEN_CODES.includes((err as MongoServerError).code as number)) {
      await tokens().deleteOne({ _id: TOKEN_DOC_ID }).catch(() => {});
    }
    reopen();
  });
}

// Keep retrying: a failed attempt (e.g. still offline) schedules the next one.
function reopen() {
  setTimeout(() => {
    open().catch((err) => {
      console.error("[changeStreams] reopen failed, retrying", err);
      reopen();
    });
  }, 1000);
}

// Call once, after connectDb().
export async function startChangeStreams() {
  const db = getDb();
  // Pre-images let us see teamId/resource of a deleted claim (including TTL expiries). The setting lives on the
  // collection: create claims with it if setup hasn't run yet (setup's collMod keeps it), and the seed must not drop claims.
  const preImages = { changeStreamPreAndPostImages: { enabled: true } };
  await db
    .command({ collMod: "claims", ...preImages })
    .catch((err) => (err.code === 26 ? db.createCollection("claims", preImages) : Promise.reject(err))) // 26: NamespaceNotFound
    .catch((err) => {
      console.warn("[changeStreams] could not enable pre-images on claims, so releases won't be seen (user lacks collMod?):", err.message);
    });
  await open();
}
