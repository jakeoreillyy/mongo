// Resets a team to a clean state so the demo is repeatable. Only touches
// documents for that team.
//
//   cd db && npm run seed            # team "demo"
//   cd db && npm run seed -- other   # another team
import { config } from 'dotenv'
import { MongoClient } from 'mongodb'

config({ path: new URL('../.env', import.meta.url).pathname })

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI missing from the repo root .env')

const teamId = process.argv[2] ?? 'demo'

async function main() {
  const client = new MongoClient(uri!)
  await client.connect()
  const db = client.db(process.env.MONGODB_DB ?? 'phalanx')
  // Waiters first: the server hands each released claim to a waiter.
  for (const name of ['waiters', 'claims', 'decisions', 'conflicts']) {
    const { deletedCount } = await db.collection(name).deleteMany({ teamId })
    console.log(`  ${name}: removed ${deletedCount}`)
  }
  await client.close()
  console.log(`Team "${teamId}" reset.`)
}

main().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
