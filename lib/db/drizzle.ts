import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Support both POSTGRES_URL and DATABASE_URL (Vercel/Neon integration uses DATABASE_URL)
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Database connection string not set. Please set POSTGRES_URL or DATABASE_URL environment variable.",
  );
}

export const client = postgres(connectionString);
export const db = drizzle(client, { schema });
