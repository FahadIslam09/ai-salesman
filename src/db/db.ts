// src/db/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from the environment variables.");
}

// Initialize the Neon HTTP client for serverless environments
const sql = neon(process.env.DATABASE_URL);

// Export the Drizzle database instance bundled with our 10-table schema
export const db = drizzle(sql, { schema });