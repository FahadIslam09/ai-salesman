import { db } from "../db/db";
import { pages, botConfigs, products, faqs, conversations, messages } from "../db/schema";
import { desc, eq } from "drizzle-orm";
import { buildPagePrompt, buildSystemPrompt } from "../utils/prompt";

async function main() {
  const [page] = await db.select().from(pages).limit(1);
  if (!page) {
    console.log("No page found in database.");
    return;
  }
  const [botConfig] = await db.select().from(botConfigs).where(eq(botConfigs.pageId, page.id));
  const productRows = await db.select().from(products).where(eq(products.pageId, page.id));
  const faqRows = await db.select().from(faqs).where(eq(faqs.pageId, page.id));

  console.log("================ LIVE PROMPT BREAKDOWN ================");
  console.log(`Page: ${page.name}`);
  console.log(`Products: ${productRows.length} | FAQs: ${faqRows.length}\n`);

  const prompt = await buildPagePrompt(page.id, botConfig, {
    storeName: page.name,
    customerName: "Fahad Islam",
    messageText: "kono tshirt ache?",
  });

  console.log(`TOTAL SYSTEM PROMPT: ${prompt.length} chars (~${Math.round(prompt.length / 3.5)} tokens)\n`);

  const sections = prompt.split("\n\n## ");
  for (const s of sections) {
    const lines = s.split("\n");
    const title = lines[0].replace(/^##\s*/, "").substring(0, 45);
    const chars = s.length;
    const tokens = Math.round(chars / 3.5);
    console.log(`• [${title}] ➔ ${chars} chars (~${tokens} tokens)`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
