import { db } from "../db/db";
import { pages, botConfigs, products, faqs } from "../db/schema";
import { eq } from "drizzle-orm";
import { buildPagePrompt } from "../utils/prompt";

async function main() {
  const [page] = await db.select().from(pages).limit(1);
  if (!page) {
    console.log("No page found.");
    return;
  }
  const [botConfig] = await db.select().from(botConfigs).where(eq(botConfigs.pageId, page.id));
  const productRows = await db.select().from(products).where(eq(products.pageId, page.id));

  console.log("================ JIT MICRO-PROMPT BENCHMARK ================");
  console.log(`Store: ${page.name} (${productRows.length} products in DB)\n`);

  const scenarios = [
    {
      name: "1. Price Inquiry ('Mens Premium Blank T-shirt er dam koto?')",
      intent: "price_inquiry" as const,
      targetProducts: ["Mens Premium Blank T-shirt"],
    },
    {
      name: "2. Negotiation / Lowball ('300 takai deya jabe?')",
      intent: "negotiation" as const,
      targetProducts: ["Mens Premium Blank T-shirt"],
    },
    {
      name: "3. Photo Request ('chobi dekhano jabe?')",
      intent: "photo_request" as const,
      targetProducts: ["Mens Premium Blank T-shirt"],
    },
    {
      name: "4. Checkout / Address ('Munnafer Mor, Rajshahi, 01712345678')",
      intent: "order_checkout" as const,
      targetProducts: [],
    },
    {
      name: "5. Browsing / Catalog ('kono shirt ache?')",
      intent: "browsing" as const,
      targetProducts: [],
    },
  ];

  for (const s of scenarios) {
    const prompt = await buildPagePrompt(page.id, botConfig, {
      storeName: page.name,
      customerName: "Fahad Islam",
      intent: s.intent,
      targetProducts: s.targetProducts,
    });

    const tokens = Math.round(prompt.length / 3.5);
    console.log(`[${s.name}]`);
    console.log(`Prompt Length: ${prompt.length} chars | ~${tokens} tokens\n`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
