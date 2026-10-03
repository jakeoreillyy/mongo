// Creates Phalanx's collections, validators and indexes in Atlas. Safe to
// re-run: existing collections get their validator updated, existing indexes
// are left alone.
//
//   cd db && npm run setup
//
// Reads MONGODB_URI from the repo root .env. Database name defaults to
// "phalanx" (override with MONGODB_DB).
import { config } from 'dotenv'
import { type Db, type Document, MongoClient } from 'mongodb'

config({ path: new URL('../.env', import.meta.url).pathname })

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI missing from the repo root .env')

const DB_NAME = process.env.MONGODB_DB ?? 'phalanx'
// Must match the embedding model the server uses for claims.
const EMBED_DIMS = Number(process.env.EMBED_DIMS ?? 1024)

const str = { bsonType: 'string', minLength: 1 }
const date = { bsonType: 'date' }

// Times are BSON dates. The TTL index only works on dates, so the server must
// store expiresAt as a Date, not epoch ms.
const VALIDATORS: Record<string, Document> = {
  claims: {
    bsonType: 'object',
    required: ['teamId', 'resource', 'agentId', 'task', 'createdAt', 'expiresAt'],
    properties: {
      teamId: str,
      resource: str,
      agentId: str,
      owner: { bsonType: 'string' },
      task: str,
      createdAt: date,
      expiresAt: date,
      embedding: { bsonType: 'array', items: { bsonType: ['double', 'int'] } },
    },
  },
  decisions: {
    bsonType: 'object',
    required: ['teamId', 'module', 'agentId', 'text', 'createdAt'],
    properties: {
      teamId: str,
      module: str,
      agentId: str,
      text: str,
      createdAt: date,
      supersedes: { bsonType: 'objectId' },
      embedding: { bsonType: 'array', items: { bsonType: ['double', 'int'] } },
    },
  },
  conflicts: {
    bsonType: 'object',
    required: ['teamId', 'resource', 'agentId', 'heldBy', 'createdAt'],
    properties: { teamId: str, resource: str, agentId: str, heldBy: str, task: { bsonType: 'string' }, createdAt: date },
  },
  waiters: {
    bsonType: 'object',
    required: ['teamId', 'resource', 'agentId', 'createdAt'],
    properties: { teamId: str, resource: str, agentId: str, createdAt: date },
  },
}

async function ensureCollection(db: Db, name: string, schema: Document) {
  const exists = (await db.listCollections({ name }, { nameOnly: true }).toArray()).length > 0
  const validator = { $jsonSchema: schema }
  if (exists) {
    await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' })
    console.log(`  ${name}: validator updated`)
  } else {
    await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' })
    console.log(`  ${name}: created`)
  }
}

async function main() {
  const client = new MongoClient(uri!)
  await client.connect()
  const db = client.db(DB_NAME)
  console.log(`Connected to ${DB_NAME}`)

  console.log('Collections and $jsonSchema validators:')
  for (const [name, schema] of Object.entries(VALIDATORS)) await ensureCollection(db, name, schema)

  console.log('Indexes:')
  // The guarantee: one holder per module per team. E11000 is the conflict signal.
  await db.collection('claims').createIndex({ teamId: 1, resource: 1 }, { unique: true, name: 'one_holder_per_resource' })
  // Dead agents: Mongo's TTL monitor deletes a claim once expiresAt passes (runs about once a minute).
  await db.collection('claims').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'claim_ttl' })
  await db.collection('decisions').createIndex({ teamId: 1, module: 1, createdAt: -1 }, { name: 'recent_decisions' })
  await db.collection('conflicts').createIndex({ teamId: 1, createdAt: -1 }, { name: 'recent_conflicts' })
  await db.collection('waiters').createIndex({ teamId: 1, resource: 1, createdAt: 1 }, { name: 'wait_queue' })
  console.log('  claims, decisions, conflicts, waiters: ok')

  console.log('Atlas Vector Search:')
  const claims = db.collection('claims')
  const existing = await claims.listSearchIndexes('claims_vector').toArray()
  if (existing.length) {
    console.log(`  claims_vector: already exists (${existing[0].status ?? 'unknown status'})`)
  } else {
    await claims.createSearchIndex({
      name: 'claims_vector',
      type: 'vectorSearch',
      definition: {
        fields: [
          { type: 'vector', path: 'embedding', numDimensions: EMBED_DIMS, similarity: 'cosine' },
          { type: 'filter', path: 'teamId' },
        ],
      },
    })
    console.log(`  claims_vector: requested (${EMBED_DIMS} dims, filter on teamId). It builds in the background.`)
  }

  await client.close()
  console.log('Done.')
}

main().catch((err) => {
  console.error('Setup failed:', err.message)
  process.exit(1)
})
