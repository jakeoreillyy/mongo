// Shared Mongo connection. A's server skeleton may replace this; keep the getDb() shape.
import "dotenv/config";
import { MongoClient, Db } from "mongodb";

let client: MongoClient | undefined;

export async function getDb(): Promise<Db> {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db(process.env.MONGODB_DB ?? "phalanx");
}

export async function closeDb(): Promise<void> {
  await client?.close();
  client = undefined;
}
