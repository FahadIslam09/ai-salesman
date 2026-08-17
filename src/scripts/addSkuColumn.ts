import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  console.log("Running migration...");
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;`;
  console.log("Migration finished successfully.");
  const res = await sql`SELECT id, name, sku FROM products LIMIT 5;`;
  console.log("Products in DB:", res);
}

main().catch(console.error);
