import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  console.log("Adding discount_type column to products table...");
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent';`;
  console.log("Migration completed successfully.");
}

main().catch(console.error);
