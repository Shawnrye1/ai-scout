import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Lazy initialization to avoid build-time errors when env vars aren't available
let _client: ReturnType<typeof postgres> | null = null;
let _db: PostgresJsDatabase<typeof schema> | null = null;

function getConnectionString(): string {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Database connection string not set. Please set POSTGRES_URL or DATABASE_URL environment variable.",
    );
  }
  return connectionString;
}

export const client = new Proxy({} as ReturnType<typeof postgres>, {
  get(_, prop) {
    if (!_client) {
      _client = postgres(getConnectionString());
    }
    return (_client as any)[prop];
  },
});

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    if (!_db) {
      if (!_client) {
        _client = postgres(getConnectionString());
      }
      _db = drizzle(_client, { schema });
    }
    return (_db as any)[prop];
  },
});
