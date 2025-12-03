import { MongoClient } from "mongodb";

const mongodbUrl = "mongodb://localhost:27017/timetrack";

const uri = (process.env.MONGODB_URI as string) || mongodbUrl;
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error("Please add your Mongo URI to .env");
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDB(dbName: string) {
  const client = await clientPromise;
  return client.db(dbName);
}
export default clientPromise;
