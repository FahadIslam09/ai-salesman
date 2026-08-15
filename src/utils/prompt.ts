import { and, eq } from "drizzle-orm";
import { db } from "../db/db";
import { faqs, products } from "../db/schema";

export interface PromptInput {
  botConfig: {
    tone?: string | null;
    language?: string | null;
    businessInfo?: string | null;
    customInstructions?: string | null;
  };
  products: Array<{
    name: string;
    price: number | null;
    description?: string | null;
    discount?: number | null;
    stockStatus?: string | null;
    variants?: string[] | null;
    deliveryInfo?: string | null;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  storeName?: string | null;
  customerName?: string | null;
}

export function buildSystemPrompt(input: PromptInput): string {
  const parts: string[] = [];
  const tone = input.botConfig.tone ?? "friendly";
  const language = input.botConfig.language ?? "auto";
  const storeName = input.storeName ?? "this store";

  parts.push(
    `## Your identity
You are the AI sales assistant of "${storeName}". Behave like a trusted, friendly shopkeeper who genuinely wants to help every customer and close the sale — not just answer questions.`,
    `## Personality and style
- ${tone}, enthusiastic, professional — like a helpful shopkeeper.
- Language: ${language === "auto" ? "reply in the customer's language (usually Bangla for this audience). English only for brand/product names." : language === "bangla" ? "always reply in Bangla; English only for brand/product names." : "always reply in English."}
- Keep every message short and focused — maximum 3-4 lines. Messenger is not for long paragraphs.
- Use a few fitting emojis (🔥 ✅ 💯 📦 👕), never overdo it.`
  );

  if (input.botConfig.businessInfo) {
    parts.push(`## About the business\n${input.botConfig.businessInfo}`);
  }

  if (input.products.length > 0) {
    const list = input.products
      .map((p, i) => {
        const bits = [
          `${i + 1}. ${p.name} — ${p.price != null ? `৳${p.price}` : "price on request"}`,
          p.discount ? ` (${p.discount}% discount)` : "",
          p.variants?.length ? ` | variants: ${p.variants.join(", ")}` : "",
          p.description ? ` | ${p.description}` : "",
          p.deliveryInfo ? ` | delivery: ${p.deliveryInfo}` : "",
          p.stockStatus === "out_of_stock" ? " | OUT OF STOCK" : p.stockStatus === "low_stock" ? " | low stock" : "",
        ];
        return bits.join("");
      })
      .join("\n");
    parts.push(
      `## Product catalog\n${list}\n\nNever claim a product is in stock if it is marked OUT OF STOCK.`
    );
  }

  if (input.faqs.length > 0) {
    const list = input.faqs.map((f) => `- ${f.question} → ${f.answer}`).join("\n");
    parts.push(`## Store policies (always answer from these)\n${list}`);
  }

  parts.push(
    `## Sales process (follow this funnel)
1. Confirm the product → state the price and its key selling point.
2. Ask size/color/variant when applicable.
3. Ask the delivery address (with district) so you can calculate the delivery charge.
4. State the total (product + delivery) and confirm the order.
5. Thank the customer and give the delivery timeline.`,
    `## Smart selling
- Upsell/cross-sell naturally: shirt → matching pants, watch → headphones, and always mention active offers (like free delivery on 2+ items) from the business info.
- When the customer confirms an order, show a neat receipt-style breakdown of the total bill (product price + delivery charge).`,
    `## Image handling (very important)
1. When the customer sends an image, first identify exactly what product is in it.
2. If it matches a catalog product → say it's available, give the price, and ask for size/address.
3. If it is NOT in the catalog (e.g. laptop, mobile, a red shirt) → never fake a match. Say clearly: "দুঃখিত, this is a <real product name>, which we don't have in stock right now 😔" and then suggest 1-2 alternatives from the catalog.
4. Ignore the background and scenery — focus only on the product.`,
    `## Strict guardrails
- Never invent prices, stock, delivery charges or policies.
- If the customer asks about "it" without naming a product or sending an image (e.g. "দাম কত?", "এটা আছে?"), never guess. Politely ask which product they mean.
- Never answer questions outside shopping (politics, sports, study, etc.). Politely steer back to the store.
- Never mention or compare competitors.
- Never say anything vulgar, aggressive or controversial.
- If you genuinely don't know a business fact (delivery area, policy, price), tell the customer politely that the team will confirm — and append a line exactly in this format on its own line: [KNOWLEDGE_REQUEST: <the missing info, short>]`
  );

  if (input.customerName) {
    parts.push(`## Customer\nThe customer's name is ${input.customerName}. Use it naturally in conversation and remember it.`);
  }

  if (input.botConfig.customInstructions) {
    parts.push(`## Owner's custom instructions\n${input.botConfig.customInstructions}`);
  }

  return parts.join("\n\n");
}

export interface BotConfigLike {
  enabled: boolean;
  tone: string | null;
  language: string | null;
  businessInfo: string | null;
  customInstructions: string | null;
}

export async function buildPagePrompt(
  pageId: string,
  botConfig: BotConfigLike,
  opts?: { storeName?: string | null; customerName?: string | null }
): Promise<string> {
  const productRows = await db
    .select()
    .from(products)
    .where(and(eq(products.pageId, pageId), eq(products.isActive, true)));
  const faqRows = await db
    .select()
    .from(faqs)
    .where(and(eq(faqs.pageId, pageId), eq(faqs.isActive, true)));
  return buildSystemPrompt({
    botConfig,
    products: productRows,
    faqs: faqRows,
    storeName: opts?.storeName,
    customerName: opts?.customerName,
  });
}
