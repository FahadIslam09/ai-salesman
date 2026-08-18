import { db } from "./db/db";
import { customers, messages, conversations } from "./db/schema";
import { eq, isNull, or } from "drizzle-orm";
import { extractNameFromGreeting } from "./utils/nameExtractor";

async function run() {
  console.log("Checking for customers without names...");
  const allCustomers = await db
    .select()
    .from(customers)
    .where(or(isNull(customers.name), eq(customers.name, "Unknown customer"), eq(customers.name, "Unknown")));

  console.log(`Found ${allCustomers.length} customers without name.`);

  let updatedCount = 0;
  for (const c of allCustomers) {
    // Find all conversations for this customer
    const convs = await db
      .select()
      .from(conversations)
      .where(eq(conversations.customerId, c.id));

    for (const conv of convs) {
      // Find all messages in this conversation
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      for (const m of msgs) {
        const name = extractNameFromGreeting(m.content);
        if (name) {
          await db.update(customers).set({ name }).where(eq(customers.id, c.id));
          console.log(`✅ Updated customer PSID ${c.psid} -> Name: "${name}" from message: "${m.content}"`);
          updatedCount++;
          break;
        }
      }
    }
  }

  console.log(`Done. Updated ${updatedCount} customers.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
