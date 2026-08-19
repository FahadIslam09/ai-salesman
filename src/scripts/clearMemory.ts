import "dotenv/config";
import { db } from "../db/db";
import { conversations, messages, followUps } from "../db/schema";

async function main() {
  console.log("🧹 Clearing AI memory and conversation histories...");

  // 1. Delete all message history
  await db.delete(messages);

  // 2. Clear all summaries and conversation memory
  await db.update(conversations).set({
    summary: null,
    summarizedUpto: null,
    status: "new",
    attentionReason: null,
  });

  // 3. Cancel any scheduled follow-ups
  await db.update(followUps).set({
    status: "cancelled",
    reason: "Memory reset",
  });

  console.log("✅ AI conversation memory, message histories, and summaries have been 100% cleared!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error clearing memory:", err);
  process.exit(1);
});
