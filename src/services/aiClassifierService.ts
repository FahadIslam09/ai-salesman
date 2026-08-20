import axios from "axios";
import { env } from "../config/env";
import { detectRequiredModules, PromptModule, HistoryMsgLike, SalesIntent } from "../utils/prompt";

export const CLASSIFIER_MODEL = "google/gemini-2.5-flash-lite";

export interface ClassificationResult {
  intent:
  | "browsing"
  | "price_inquiry"
  | "negotiation"
  | "photo_request"
  | "order_checkout"
  | "follow_up"
  | "policy_faq"
  | "general_qa";
  targetProducts: string[];
  modules: Set<PromptModule>;
  tokensIn: number;
  tokensOut: number;
}

export async function classifyCustomerIntent(
  messageText: string,
  hasImages: boolean,
  history: HistoryMsgLike[] = [],
  availableProducts: Array<{ name: string; price: number | null }> = []
): Promise<ClassificationResult> {
  const fallbackModules = detectRequiredModules(messageText, hasImages, history);
  let fallbackIntent: SalesIntent = "general_qa";
  if (fallbackModules.has("follow_up")) fallbackIntent = "follow_up";
  else if (fallbackModules.has("negotiation")) fallbackIntent = "negotiation";
  else if (fallbackModules.has("checkout_and_order")) fallbackIntent = "order_checkout";
  else if (fallbackModules.has("policies_and_faq")) fallbackIntent = "policy_faq";
  else if (fallbackModules.has("photos")) fallbackIntent = "photo_request";
  else if (fallbackModules.has("pricing")) fallbackIntent = "price_inquiry";

  const fallbackResult: ClassificationResult = {
    intent: fallbackIntent,
    targetProducts: [],
    modules: fallbackModules,
    tokensIn: 0,
    tokensOut: 0,
  };

  if (!env.openrouterApiKey || !messageText.trim()) {
    return fallbackResult;
  }

  const productList = availableProducts
    .map((p) => `- ${p.name} (${p.price ? `${p.price} tk` : "price on request"})`)
    .join("\n");

  const recentHistory = history
    .slice(-2)
    .map((h) => `${h.role}: ${h.content}`)
    .join("\n");

  const systemPrompt = `You are a fast intent classifier for an e-commerce messenger bot in Bangladesh.
The customer writes in Bangla, Banglish, or English.

Your job:
1. Identify customer intent:
   - "browsing": asking what products exist ("kono shirt ache?", "ki ki ache?")
   - "price_inquiry": asking price ("dam koto?", "koto taka?")
   - "negotiation": asking for discounts/bargaining ("300 takai hobe?", "kom koren", "budget kom")
   - "photo_request": asking to see pictures/colors ("chobi dekhano jabe?", "Grape Shake color dekhbo")
   - "order_checkout": sending address, phone number, asking to order, payment method
   - "follow_up": customer is busy, postponing, or asking you to knock/message/follow-up later ("I am busy right now, please knock me after 1 hour", "amke 5 min por messgae dio", "1 ghonta por nok diyen", "ekhon busy", "kal shokale knock koren", "pore janabo")
   - "policy_faq": asking delivery charges, delivery area, delivery timing, return, exchange, warranty, refund policies ("delivery charge koto?", "delivery fee?", "delivery kobe pabo?", "return policy?")
   - "general_qa": greetings or general questions
2. Identify target catalog product(s) being discussed (if any). Match to catalog names exactly.
3. Select prompt modules needed: ["pricing", "negotiation", "photos", "checkout_and_order", "follow_up", "policies_and_faq"].

Catalog:
${productList || "None"}

Output strict JSON only with schema:
{
  "intent": "string",
  "target_products": ["exact catalog name"],
  "modules": ["pricing"]
}`;

  const userContent = `${recentHistory ? `Recent history:\n${recentHistory}\n\n` : ""}Current message: "${messageText}"${hasImages ? " (Customer also sent an image attachment)" : ""}`;

  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: CLASSIFIER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${env.openrouterApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 5000, // 5s max
      }
    );

    const raw = res.data.choices[0]?.message?.content ?? "{}";
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

    const parsedModules = new Set<PromptModule>();
    if (Array.isArray(parsed.modules)) {
      for (const m of parsed.modules) {
        if (
          m === "pricing" ||
          m === "negotiation" ||
          m === "photos" ||
          m === "checkout_and_order" ||
          m === "follow_up" ||
          m === "policies_and_faq"
        ) {
          parsedModules.add(m);
        }
      }
    }

    // Always ensure at least 1 module
    if (parsedModules.size === 0) {
      fallbackModules.forEach((m) => parsedModules.add(m));
    }

    const matchedProducts: string[] = [];
    if (Array.isArray(parsed.target_products)) {
      for (const name of parsed.target_products) {
        if (typeof name === "string") {
          const match = availableProducts.find(
            (p) =>
              p.name.toLowerCase() === name.toLowerCase() ||
              name.toLowerCase().includes(p.name.toLowerCase()) ||
              p.name.toLowerCase().includes(name.toLowerCase())
          );
          if (match && !matchedProducts.includes(match.name)) {
            matchedProducts.push(match.name);
          }
        }
      }
    }

    return {
      intent: parsed.intent ?? fallbackIntent,
      targetProducts: matchedProducts,
      modules: parsedModules,
      tokensIn: res.data.usage?.prompt_tokens ?? 0,
      tokensOut: res.data.usage?.completion_tokens ?? 0,
    };
  } catch (err: any) {
    console.warn("[classifier] Fast classifier skipped or timed out, using regex router fallback:", err.message);
    return fallbackResult;
  }
}
