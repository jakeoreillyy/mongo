import { MongoClient, Db } from "mongodb";

let client: MongoClient;
let db: Db;

export async function connectDb(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB ?? "phalanx"); // same default as db/setup.ts and db/seed.ts
  console.log("Connected to MongoDB");
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("Database not connected. Call connectDb() first.");
  return db;
}

export function getClient(): MongoClient {
  if (!client) throw new Error("Client not connected. Call connectDb() first.");
  return client;
}
