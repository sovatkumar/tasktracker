import { MongoClient } from "mongodb";

const baseUri = process.env.MONGODB_BASE_URI || "mongodb://localhost:27017";

const clientCache: Record<string, Promise<MongoClient>> = {};

export function getTenantDB(tenantName: string) {
  if (!tenantName) throw new Error("tenantName is required");

  if (!clientCache[tenantName]) {
    const uri = `${baseUri}/${tenantName}`;
    const client = new MongoClient(uri);
    clientCache[tenantName] = client.connect();
  }

  return clientCache[tenantName];
}
