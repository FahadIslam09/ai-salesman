import "dotenv/config";
import { db } from "../db/db";
import { sql } from "drizzle-orm";
import { users } from "../db/schema";

async function main() {
  console.log("🚀 Running Super Admin Schema Migration...");

  // 1. Add role and is_banned columns to user table if missing
  await db.execute(sql`
    ALTER TABLE "user" 
    ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS "is_banned" BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  // 2. Create system_settings table if missing
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "system_settings" (
      "key" TEXT PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      "updated_by" TEXT
    );
  `);

  // 3. Create credit_adjustments table if missing
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "credit_adjustments" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "admin_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "amount" BIGINT NOT NULL,
      "reason" TEXT NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  // 3.1 Create audit_logs table if missing
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "admin_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "admin_email" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "target_type" TEXT NOT NULL,
      "target_id" TEXT,
      "details" TEXT NOT NULL,
      "ip_address" TEXT,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  // 4. Promote all existing user accounts to super_admin (or at least the first user)
  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} user(s) in database.`);
  
  if (allUsers.length > 0) {
    // Promote the first user (or all existing development users) to super_admin
    await db.execute(sql`UPDATE "user" SET "role" = 'super_admin' WHERE "role" = 'user'`);
    console.log("👑 Promoted existing user(s) to 'super_admin'.");
  }

  // 5. Seed default system settings if missing
  await db.execute(sql`
    INSERT INTO "system_settings" ("key", "value", "updated_at")
    VALUES 
      ('maintenance_mode', 'false', NOW()),
      ('default_starter_credits', '50', NOW()),
      ('global_announcement', '', NOW()),
      ('global_markup_multiplier', '4', NOW())
    ON CONFLICT ("key") DO NOTHING;
  `);

  console.log("✅ Super Admin database schema migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
