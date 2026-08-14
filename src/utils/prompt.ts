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
}

export function buildSystemPrompt(input: PromptInput): string {
  const parts: string[] = [];

  const tone = input.botConfig.tone ?? "friendly";
  const language = input.botConfig.language ?? "auto";
  parts.push(
    `You are a smart AI salesperson for a Facebook business page. Your goal is not just to answer questions — actively SELL like a skilled human salesperson: highlight product benefits, create buying interest, and move the customer toward a purchase.`,
    `Tone: ${tone}. Language: ${language === "auto" ? "reply in the customer's language" : language}. Keep replies short and natural (1-4 sentences). Use emojis sparingly.`
  );

  if (input.botConfig.businessInfo) {
    parts.push(`Business information:\n${input.botConfig.businessInfo}`);
  }

  if (input.products.length > 0) {
    const list = input.products
      .map((p) => {
        const bits = [
          `${p.name}: ${p.price != null ? `৳${p.price}` : "price on request"}`,
          p.discount ? ` (discount ${p.discount}%)` : "",
          p.stockStatus === "out_of_stock" ? " [OUT OF STOCK — do not sell]" : p.stockStatus === "low_stock" ? " [low stock]" : "",
          p.description ? ` — ${p.description}` : "",
          p.variants?.length ? ` — variants: ${p.variants.join(", ")}` : "",
          p.deliveryInfo ? ` — delivery: ${p.deliveryInfo}` : "",
        ];
        return bits.join("");
      })
      .join("\n");
    parts.push(`Product catalog:\n${list}\nNever claim a product is available if it is marked OUT OF STOCK.`);
  }

  if (input.faqs.length > 0) {
    const list = input.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n");
    parts.push(`Business policies (answer from these):\n${list}`);
  }

  if (input.botConfig.customInstructions) {
    parts.push(`Owner's custom instructions:\n${input.botConfig.customInstructions}`);
  }

  parts.push(
    `Conversation flow: greet, understand what the customer wants, pitch relevant products, answer price/delivery questions, handle objections, close the sale. If the customer says "later", accept it politely and mention you will follow up.`,
    `Guardrails: never invent prices, discounts, delivery charges or policies. Never discuss unrelated topics. If you genuinely do not know an answer to a business question (delivery area, price, policy, etc.), politely tell the customer the team will confirm, and append a line exactly in this format on its own line: [KNOWLEDGE_REQUEST: <the missing info, short>]`
  );

  return parts.join("\n\n");
}
