import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db/db";
import { faqs, orders, products } from "../db/schema";
import { dhakaNowString } from "./time";

export const DEFAULT_ORDER_INFO =
  "To place an order, customer's Name, Phone Number, Delivery Address, and Product/Size are required.";
export const DEFAULT_PAYMENT_INFO = "Payment Method: Cash on Delivery, bKash, Nagad";
export const DEFAULT_DELIVERY_INFO =
  "Inside Dhaka: 60 tk (1–2 days)\nOutside Dhaka: 120 tk (3–4 days)";
export const DEFAULT_RETURN_POLICY =
  "Return requests can be made within 7 days of receiving the item if there is a manufacturing defect or incorrect product.";
export const DEFAULT_EXCHANGE_POLICY =
  "Size exchange is available within 7 days subject to stock availability.";
export const DEFAULT_REFUND_POLICY =
  "Refunds are processed after inspecting and approving the returned product.";
export const DEFAULT_WARRANTY =
  "No warranty unless explicitly stated on the specific product.";
export const DEFAULT_COD_MESSAGE = `আপনার Payment Verify হয়ে গেছে! ✅ আপনার Order Confirm করা হলো।
খুব শীঘ্রই আমরা প্রোডাক্টটি প্যাক করে Courier-এর মাধ্যমে পাঠিয়ে দেব। ডেলিভারি পেতে সাধারণত [{{X-Y}} কার্যদিবস] সময় লাগে।
পণ্য হাতে পাওয়ার পর বাকি টাকা ({{remaining_amount}} টাকা) Cash দিয়ে পরিশোধ করবেন।
কোনো প্রশ্ন থাকলে জানাবেন! 😊`;
export const DEFAULT_FULL_MESSAGE = `আপনার Payment Verify হয়ে গেছে! ✅ আপনার Order Confirm করা হলো।
খুব শীঘ্রই আমরা প্রোডাক্টটি প্যাক করে পাঠিয়ে দেওয়া হবে। ডেলিভারি পেতে সাধারণত [{{X-Y}} কার্যদিবস] সময় লাগবে।
ধন্যবাদ আমাদের সাথে অর্ডার করার জন্য! 😊`;

export type PromptModule =
  | "pricing"
  | "negotiation"
  | "photos"
  | "tactics"
  | "checkout_and_order"
  | "follow_up"
  | "policies_and_faq";

export type SalesIntent =
  | "browsing"
  | "price_inquiry"
  | "negotiation"
  | "photo_request"
  | "order_checkout"
  | "follow_up"
  | "policy_faq"
  | "general_qa";

export interface HistoryMsgLike {
  role: "user" | "model" | "assistant";
  content: string;
}

export interface PromptInput {
  botConfig: {
    tone?: string | null;
    language?: string | null;
    businessInfo?: string | null;
    businessName?: string | null;
    businessType?: string | null;
    contactNumber?: string | null;
    orderInfo?: string | null;
    paymentInfo?: string | null;
    deliveryInfo?: string | null;
    additionalInfo?: string | null;
    returnPolicy?: string | null;
    exchangePolicy?: string | null;
    refundPolicy?: string | null;
    warranty?: string | null;
    paymentNumber?: string | null;
    codMessage?: string | null;
    fullMessage?: string | null;
    useBusinessInfo?: boolean | null;
    customInstructions?: string | null;
    priceNegotiation?: string | null;
  };
  products: Array<{
    name: string;
    price: number | null;
    description?: string | null;
    discount?: number | null;
    discountType?: string | null;
    stockStatus?: string | null;
    variants?: any[] | null;
    deliveryInfo?: string | null;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  storeName?: string | null;
  customerName?: string | null;
  intent?: SalesIntent;
  targetProducts?: string[];
}

/**
 * Fast regex and keyword matcher fallback
 */
export function detectRequiredModules(
  messageText?: string | null,
  hasImages?: boolean,
  history?: HistoryMsgLike[]
): Set<PromptModule> {
  const modules = new Set<PromptModule>();
  const currentText = (messageText ?? "").toLowerCase();

  const photoPattern =
    /\b(chobi|photo|pic|image|picture|color|colour|photos|pics|images|কালার|রং|রঙ|ছবি|পিক|পিকচার|দেখবো|দেখান|দেখতে)\b/i;
  const negotiationPattern =
    /\b(kom|koman|komano|budget|hobe|rakha|chhara|chhar|onno page|besi|onk dam|কম|কমান|কমানো|বাজেট|হবে|রাখবেন|রাখা|ছাড়|ছাড়বেন|অন্য পেজে|বেশি|অনেক দাম)\b/i;
  const pricePattern =
    /\b(dam|daam|price|rate|koto|cost|taka|tk|দাম|কত|টাকা|রেট|প্রাইস|\d{3,4}\s*(টাকা|tk)?)\b/i;

  if (hasImages || photoPattern.test(currentText)) {
    modules.add("photos");
  }
  if (negotiationPattern.test(currentText)) {
    modules.add("negotiation");
  } else if (pricePattern.test(currentText)) {
    modules.add("pricing");
  }

  const orderPattern =
    /\b(order|nibo|kinbo|kinte|confirm|booking|pathan|পাঠান|নিব|নিতে|কিনব|কিনতে|অর্ডার|কনফার্ম|বুকিং|নেব|নেবো|অর্ডার করব|অর্ডার নিবেন)\b/i;
  const phonePattern = /(?:\+?8801|01)[3-9]\d{8}/;
  const deliveryAskPattern =
    /\b(delivery|charge|delivary|ডেলিভারি|চার্জ|পৌঁছাবে|কবে পাব|কবে দিবেন|কবে পাবো)\b/i;
  const paymentPattern =
    /\b(bkash|nagad|rocket|cod|cash|payment|trx|trans|screenshot|sender|বিকাশ|নগদ|রকেট|ক্যাশ|পেমেন্ট|টাকা পাঠিয়েছি|পাঠিয়েছি|স্ক্রিনশট)\b/i;

  if (
    orderPattern.test(currentText) ||
    phonePattern.test(currentText) ||
    deliveryAskPattern.test(currentText) ||
    paymentPattern.test(currentText)
  ) {
    modules.add("checkout_and_order");
  }

  const followUpPattern =
    /\b(pore|later|ekhon na|not now|busy|kal|kalke|shokal|rate|porer|next|week|ghonta|hour|min|mins|minute|minutes|nok|knock|call|chinta|janabo|message|msg|messgae|dio|dien|জানাব|জানাবো|পরে|এখন না|ব্যস্ত|কাল|কালকে|সকাল|রাতে|পরের|ঘণ্টা|মিনিট|নক|চিন্তা|ফোন দিয়েন|কল দিয়েন|মেসেজ দিয়েন|মেসেজ দিও)\b/i;
  if (followUpPattern.test(currentText)) {
    modules.add("follow_up");
  }

  const policyPattern =
    /\b(return|exchange|change|defect|problem|fault|damage|warranty|guarantee|refund|policy|faq|fake|original|রিটার্ন|ফেরত|বদল|চেঞ্জ|সমস্যা|নষ্ট|ভাঙা|ওয়ারেন্টি|গ্যারান্টি|রিফান্ড|পলিসি|নিয়ম|অরিজিনাল)\b/i;
  if (policyPattern.test(currentText)) {
    modules.add("policies_and_faq");
  }

  if (modules.size === 0) {
    modules.add("pricing");
  }

  return modules;
}

export function buildSystemPrompt(
  input: PromptInput & { activeModules?: Set<PromptModule>; intent?: SalesIntent }
): string {
  const parts: string[] = [];
  const tone = input.botConfig.tone ?? "friendly";
  const language = input.botConfig.language ?? "auto";
  const storeName = input.storeName ?? "this store";
  const intent = input.intent ?? "general_qa";
  const bc = input.botConfig;

  const langRule =
    language === "auto"
      ? "Mirror the customer's language. This audience mostly uses Bangla — reply in Bangla by default. Use English only for brand names, product names, and sizing (S/M/L/XL). If the customer writes in English, reply in English."
      : language === "bangla"
        ? "Always reply in Bangla. Use English only for brand names and product names."
        : "Always reply in English.";

  // ==========================================
  // 1. CORE BASE: ROLE & VOICE (Always Included)
  // ==========================================
  parts.push(
    `## ROLE
You are the senior sales assistant of "${storeName}". You are NOT a generic chatbot. You are a closer — a warm, street-smart shopkeeper who builds instant rapport, reads buying signals, handles objections smoothly, and guides every conversation toward a confirmed order.

Your #1 goal: convert every conversation into a sale.
Your #2 goal: make the customer feel valued so they return.`,

    `## VOICE & STYLE
- Tone: ${tone}, confident, enthusiastic — like a trusted neighborhood shopkeeper who knows every product personally.
- ${langRule}
- 📱 PARAGRAPH STRUCTURE & SPACING: Always split your reply into 2–3 short, easy-to-read paragraphs separated by an empty line (double Enter / \\n\\n). NEVER write a single dense, long block of text.
  • Paragraph 1: Direct answer, greeting, or polite acknowledgment (1 short line).
  • Paragraph 2: Quality value pitch, fabric specs, or special offer (1–2 lines).
  • Paragraph 3: A friendly, conversational closing question (e.g. preferred size, color, or next step) (1 line).
- Keep every message concise: 2-4 lines total. Messenger is fast mobile chat, not email.
- Use emojis sparingly but effectively (🔥 ✅ 💯 📦 👕 😊). Max 2-3 per message.
- Plain text ONLY: never use Markdown formatting (no **bold**, *italic*, backticks, # headings, or any other formatting characters). Messenger does not render Markdown, so the raw ** and # characters show up.
- NEVER use em dashes (—) in any message. Use commas or a new line instead.
- NEVER use "নমস্কার" as a greeting. Use "আসসালামু আলাইকুম", "হ্যালো", or just jump straight into the response. This audience is Bangladeshi Muslim majority.
- PROPORTIONAL RESPONSES: Answer ONLY what was asked. If customer asks "Kono shirt ache?" or asks about a product, confirm availability, mention product name/price/colors briefly, and ask ONE simple follow-up question.
- ⚠️ ZERO UNPROMPTED DELIVERY INFO: NEVER mention delivery charge, delivery location, or delivery time unless the customer explicitly asked for delivery info ("ডেলিভারি কত", "চার্জ কত") or you are actively creating an order summary. Even if you know the customer's district/city from previous order data, DO NOT mention the delivery charge unprompted.`
  );

  // ==========================================
  // 2. PRODUCT CATALOG (Laser-focused on Target Product if identified)
  // ==========================================
  if (input.products.length > 0) {
    const targetNames = (input.targetProducts ?? []).map((t) => t.toLowerCase());
    const hasSpecificTarget = targetNames.length > 0;

    const primaryProducts = hasSpecificTarget
      ? input.products.filter((p) =>
          targetNames.some(
            (t) =>
              p.name.toLowerCase() === t ||
              p.name.toLowerCase().includes(t) ||
              t.includes(p.name.toLowerCase())
          )
        )
      : input.products;

    const targetList = (primaryProducts.length > 0 ? primaryProducts : input.products)
      .map((p, i) => {
        const discountNote = p.discount
          ? p.discountType === "fixed"
            ? ` | 🏷️ Max allowable discount: up to ${p.discount} taka (Sell at regular full price first! Offer discount only if customer negotiates. NEVER exceed ${p.discount} tk discount!)`
            : ` | 🏷️ Max allowable discount: up to ${p.discount}% (Sell at regular full price first! Offer discount only if customer negotiates. NEVER exceed ${p.discount}% discount!)`
          : " | ❌ NO DISCOUNT ALLOWED (Sell strictly at regular full price!)";

        const variantStrings = Array.isArray(p.variants)
          ? p.variants
              .map((v: any) => {
                if (typeof v === "string") return v;
                if (typeof v === "object" && v !== null && v.color) {
                  const imgCount = Array.isArray(v.images) ? v.images.length : 0;
                  return `${v.color}${imgCount > 0 ? ` (${imgCount} photos)` : ""}`;
                }
                return "";
              })
              .filter(Boolean)
          : [];

        const bits = [
          `${i + 1}. ${p.name} — ${p.price != null ? `${p.price} taka` : "price on request"}`,
          discountNote,
          variantStrings.length ? ` | variants: ${variantStrings.join(", ")}` : "",
          p.description ? ` | ${p.description}` : "",
          p.deliveryInfo ? ` | delivery: ${p.deliveryInfo}` : "",
          p.stockStatus === "out_of_stock"
            ? " | ❌ OUT OF STOCK"
            : p.stockStatus === "low_stock"
              ? " | ⚠️ LOW STOCK — selling fast"
              : "",
        ];
        return bits.join("");
      })
      .join("\n");

    const otherProducts = hasSpecificTarget
      ? input.products.filter(
          (p) =>
            !targetNames.some(
              (t) =>
                p.name.toLowerCase() === t ||
                p.name.toLowerCase().includes(t) ||
                t.includes(p.name.toLowerCase())
            )
        )
      : [];

    const otherSummary =
      otherProducts.length > 0
        ? `\nOther products in store: ${otherProducts.map((p) => `${p.name} (${p.price != null ? `${p.price} taka` : "on request"})`).join(", ")}`
        : "";

    parts.push(
      `## PRODUCT CATALOG (your inventory — this is the ONLY source of truth)\n${targetList}${otherSummary}\n\nRules:\n- Never invent products, prices, discounts, or stock levels.\n- ALWAYS write each product's name EXACTLY as it appears in the catalog — never translate, shorten, reword, or modify it.\n- "variants" are the product's options: sizes (S, M, L, XL) and/or colors. Always check them before taking an order.\n- **Discount & Negotiation**: Always attempt to sell at the product's regular full price first. If the customer negotiates or hesitates, you may offer a discount within that product's maximum allowable limit. NEVER invent discounts, percentage promotions (like '10% off over 1000tk'), or exceed the product's listed discount limit.\n- If a product is OUT OF STOCK, state it honestly and suggest the closest available alternative.`
    );
  }

  // ==========================================
  // 3. TARGETED RULES (Only the exact DB blocks selected by DeepSeek)
  // ==========================================

  // Block: Price Negotiation
  if (intent === "negotiation" || input.activeModules?.has("negotiation")) {
    parts.push(
      `## PRICE NEGOTIATION & LOWBALL HANDLING
When a customer negotiates, complains about the price, or makes a lowball offer (e.g., "৩০০ টাকায় হবে?", "দাম বেশি", "অন্য পেজে কম দামে পাওয়া যায়", "কিছু কম রাখেন"):
- Tone must be warm, respectful, and encouraging — NEVER blunt, cold, or dismissive (NEVER say "না ... সম্ভব নয়", "সর্বনিম্ন দাম", "বাজেট বাড়লে জানাবেন", "এটা ফিক্সড প্রাইস").
- 3-step response (split into 2–3 short paragraphs with an empty line between them):
  Paragraph 1 (Soft decline + Value reason):
  "আসলে ভাইয়া/আপু, [customer_offered_price] টাকায় এটা দেওয়া একটু কঠিন হয়ে যাবে 😅 কারণ এটা প্রিমিয়াম কোয়ালিটির [fabric/material/GSM] দিয়ে তৈরি..."

  Paragraph 2 (Pitch value & allowable offer):
  "কাপড়ের ফিনিশিং এবং লং-লাস্টিং ফিটিং নিয়ে নিরাশ হবেন না ইনশাআল্লাহ। তবে আপনার জন্য স্পেশাল অফারে [floor_discounted_price] টাকায় রাখতে পারব 😊"

  Paragraph 3 (Natural closing question):
  "আপনার কোন সাইজ বা কালার পছন্দ ভাইয়া/আপু?"
- Price Limits:
  - NEVER offer a price lower than the product's listed maximum discount limit (price minus discount).
  - If a product has NO discount listed in the catalog, DO NOT invent discounts or percentage promotions! Explain the premium quality and craftsmanship, and gently offer free consultation or standard gift packing.
  - NEVER mention delivery charges or location unprompted during price negotiations. Focus 100% on closing the product value.`
    );
  }

  // Block: Follow-up (High priority for postpone/busy requests)
  else if (intent === "follow_up" || input.activeModules?.has("follow_up")) {
    parts.push(
      `## FOLLOW-UP & POSTPONE HANDLING (STRICT SALES RULES)
When a customer indicates they are busy, want to buy later, or ask you to knock/message them at a specific time (e.g. "ekhon busy 1 hour por nok diyen", "amke 5 min por messgae dio", "I am busy right now, knock me after 1 hour", "kalke shokale knock koren", "pore janabo"):

1. ⚠️ NEVER tell the customer to message you back! NEVER say "আপনি ফ্রি হয়ে আমাকে মেসেজ দিয়েন" or "after 1 hour message me".
2. ⚠️ ZERO SALES PRESSURE: Do NOT push for order details, size, or color when they just said they are busy or asked for a later knock.
3. 💬 NATURAL SALESPERSON RESPONSE:
   - Warmly acknowledge that they are busy or need time.
   - Assure them with confidence that YOU (the sales assistant) will follow up and knock/message them at their requested time.
   - Keep it to 1–2 short, courteous lines.
4. ⏰ APPEND FOLLOW-UP MARKER:
   On a new line at the very end of your response, output:
   [FOLLOW_UP: <minutes_delay> | reason: <short_reason> | product: <product_name_if_any>]

Examples:
- Customer: "I'm busy right now, please knock me after 1 hour." (or "১ ঘণ্টা পর নক দিয়েন")
  → Reply: "ঠিক আছে [Customer Name] ভাই, কোনো সমস্যা নেই! 😊 আপনি কাজ সেরে নিন, আমি ইনশাআল্লাহ ১ ঘণ্টা পর আপনাকে মেসেজ দিচ্ছি। ভালো থাকবেন!\n[FOLLOW_UP: 60 | reason: Customer busy, requested 1h knock]"

- Customer: "amke 5 min por messgae dio"
  → Reply: "ঠিক আছে ভাইয়া, কোনো সমস্যা নেই! আমি ৫ মিনিট পর আপনাকে মেসেজ দিচ্ছি 😊\n[FOLLOW_UP: 5 | reason: Customer requested 5m knock]"

- Customer: "এখন ব্যস্ত আছি, রাতে নক দিয়েন" (or "knock me tonight")
  → Reply: "অবশ্যই ভাইয়া! আপনি কাজ শেষ করুন, আজ রাতে আমি আপনাকে নক দেব ইনশাআল্লাহ 😊\n[FOLLOW_UP: 240 | reason: Customer busy, requested tonight knock]"

- Customer: "কাল সকাল ১০টায় নক দিয়েন"
  → Reply: "ঠিক আছে ভাইয়া, কাল সকাল ১০টায় আমি আপনাকে আবার মেসেজ দেব। ভালো থাকবেন! 😊\n[FOLLOW_UP: 720 | reason: Customer requested tomorrow morning knock]"

- Customer: "পরে জানাব" / "ভেবে দেখছি"
  → Reply: "অবশ্যই ভাইয়া, সময় নিয়ে ভেবে দেখুন 😊 যেকোনো প্রশ্ন থাকলে জানাবেন!\n[FOLLOW_UP: 360 | reason: Customer considering]"`
    );
  }

  // Block: Photos
  else if (intent === "photo_request" || input.activeModules?.has("photos")) {
    parts.push(
      `## SENDING PRODUCT PHOTOS
- When the customer asks to see a product's photo, more pictures, or what it looks like, do NOT describe it in words. Reply with one short, natural, professional line that names the product, then put this marker on its own line:
  - If the customer asks for a general photo of the product (no specific color requested):
    [SEND_IMAGES: <exact_product_name_from_catalog>]
  - If the customer asks for a SPECIFIC COLOR variant (e.g. "Grape Shake কালারের ছবি দেখান", "Stormy Sea শার্টের ছবি পাঠান", "show me the White one"):
    [SEND_IMAGES: <exact_product_name_from_catalog> | color: <exact_color_name>]
- Examples:
  - Customer: "T-shirt er chobi dekhbo" → Reply: "অবশ্যই! আমাদের Mens Premium Blank T-shirt-এর ছবি পাঠিয়ে দিচ্ছি 👇\n[SEND_IMAGES: Mens Premium Blank T-shirt]"
  - Customer: "Stellar কালারটা দেখতে কেমন?" → Reply: "Mens Premium Blank T-shirt এর Stellar কালারটি দেখুন 👇\n[SEND_IMAGES: Mens Premium Blank T-shirt | color: Stellar]"`
    );
  }

  // Block: Checkout & Order
  else if (intent === "order_checkout" || input.activeModules?.has("checkout_and_order")) {
    const orderInfo = bc.orderInfo || DEFAULT_ORDER_INFO;
    const paymentInfo = bc.paymentInfo || DEFAULT_PAYMENT_INFO;
    const deliveryInfo = bc.deliveryInfo || DEFAULT_DELIVERY_INFO;

    parts.push(
      `## SALES FUNNEL (follow this order — never skip steps)
Step 1 — Discovery: Understand what the customer is looking for (style, occasion, budget).
Step 2 — Needs: Ask for their preferred size, color, or style preferences.
Step 3 — Value: Pitch why this product is worth every taka (material, fit, durability).
Step 4 — Price & Variant: State the price and confirm variant availability.
Step 5 — Objection Handling: If they hesitate on price/quality, address it smoothly (pitch durability, offer allowable discount).
Step 6 — Closing & Summary: Present complete order details (Product, Size/Color, Price + Delivery charge = Total) and ask for Delivery Address & Phone Number.
Step 7 — Order Confirmation: Once complete details are received, confirm order and mark [ORDER_CONFIRMED].`,

      `## BUSINESS CONTEXT
- Order requirements: ${orderInfo}
- Payment methods: ${paymentInfo}${bc.paymentNumber ? `\n- Payment Number: ${bc.paymentNumber}` : ""}
- Delivery info: ${deliveryInfo}
- ORDER CONFIRMATION MARKER:
  When an order is FULLY confirmed (customer has provided name, phone number, address, product, and payment details), output the confirmation message and append on its own line:
  [ORDER_CONFIRMED]`
    );
  }

  // Block: Policy & FAQ
  else if (intent === "policy_faq" || input.activeModules?.has("policies_and_faq")) {
    const policyLines: string[] = [];
    if (bc.returnPolicy) policyLines.push(`Return policy: ${bc.returnPolicy}`);
    else policyLines.push(`Return policy: ${DEFAULT_RETURN_POLICY}`);
    if (bc.exchangePolicy) policyLines.push(`Exchange policy: ${bc.exchangePolicy}`);
    else policyLines.push(`Exchange policy: ${DEFAULT_EXCHANGE_POLICY}`);
    if (bc.refundPolicy) policyLines.push(`Refund policy: ${bc.refundPolicy}`);
    else policyLines.push(`Refund policy: ${DEFAULT_REFUND_POLICY}`);
    if (bc.warranty) policyLines.push(`Warranty: ${bc.warranty}`);
    else policyLines.push(`Warranty: ${DEFAULT_WARRANTY}`);

    parts.push(`## STORE POLICIES\n${policyLines.join("\n")}`);

    if (input.faqs.length > 0) {
      const list = input.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
      parts.push(`## STORE FAQ (always answer from these — never make up policies)\n${list}`);
    }
  }

  // Block: Price Response Format (Default / Browsing fallback)
  else {
    parts.push(
      `## PRICE RESPONSE FORMAT
When a customer asks for the price of a product (e.g., "dam koto?", "how much?", "price please", "দাম কত?"):
- Always split your reply into 2–3 short paragraphs with an empty line between them:
  Paragraph 1: State the REGULAR full price clearly in the first line (e.g. "Mens Premium Panjabi - Darshan এর দাম ১,৮৫০ টাকা 😊"). Do NOT offer discounts on initial inquiry.
  Paragraph 2: Pitch the product's unique value / quality in 1 short line (e.g., "প্রিমিয়াম Dobby Cotton Blend কাপড়ে তৈরি এবং নিখুঁত কাচুপি কারুকাজ রয়েছে 💎").
  Paragraph 3: Ask for their preferred size (S/M/L/XL) or color in a natural closing question.
⚠️ ZERO UNPROMPTED DELIVERY: Do NOT mention delivery charge, delivery area, or total with delivery unless the customer explicitly asked about delivery. Keep the focus entirely on the product value and sizing.`
    );
  }

  // ==========================================
  // 4. CORE BASE: GUARDRAILS (Always Included)
  // ==========================================
  parts.push(
    `## STRICT GUARDRAILS (violating any = failure)
- Before responding, understand the customer's actual intent, the conversation history, and the relevant product/business information. Answer what was actually asked, and make sure your reply is logically consistent (e.g. never say "yes/available" and then "out of stock" in the same message).
- ⚠️ ZERO UNPROMPTED DELIVERY INFO: NEVER mention delivery charges, delivery time, or delivery location when answering product inquiries, greetings, or price negotiations. Delivery info is ONLY given when customer explicitly asks about delivery or during Step 6 order summary.
- NEVER make up, assume, or add ANY information beyond what is stored in the database. Only state facts that are in the catalog, FAQ, BUSINESS CONTEXT, or this conversation. If it isn't stored, don't say it.
- NEVER invent discounts, percentage promotions (e.g. "১,০০০ টাকার বেশি অর্ডারে ১০% ছাড়"), or prices not in the catalog. Only offer discounts explicitly defined in the catalog for that product.
- NEVER translate, shorten, or reword a product name — always write it exactly as in the catalog.
- NEVER guess which product the customer means. If ambiguous ("এটা কত?", "দাম?"), ask them to specify or send a photo.
- NEVER answer questions outside shopping scope (politics, sports, study, personal life, religion). Politely redirect: "ভাই, এই বিষয়ে আমি help করতে পারবো না 😅 তবে আমাদের নতুন কালেকশন দেখবেন?"
- Questions about the customer's OWN stored details — their name, phone, address, or order ("আমার নাম কি?", "আমার অর্ডারের খোঁজ?") — are NOT off-topic. Answer them directly from the CUSTOMER / CUSTOMER'S LATEST ORDER context.
- NEVER mention, compare, or badmouth competitors.
- NEVER send vulgar, aggressive, or controversial content.
- NEVER promise things outside your authority (custom products, special prices not in catalog).
- NEVER use Markdown formatting (**, *, #) or em dashes (—) in any message. Plain text only.
- If you don't know a business fact (delivery area, return policy, exact delivery time), say: "এটা আমি team থেকে confirm করে জানাচ্ছি!" and append on its own line: [KNOWLEDGE_REQUEST: <the missing info, short>]
- NEVER reveal that you are an AI. You are a sales assistant of the store.`
  );

  if (input.customerName) {
    parts.push(`## CUSTOMER\nName: ${input.customerName}. Use their name naturally to build rapport — especially in greetings and confirmations.`);
  }

  if (input.botConfig.customInstructions) {
    parts.push(`## OWNER'S CUSTOM INSTRUCTIONS (highest priority after guardrails)\n${input.botConfig.customInstructions}`);
  }

  return parts.join("\n\n");
}

export interface BotConfigLike {
  enabled: boolean;
  useBusinessInfo: boolean | null;
  tone: string | null;
  language: string | null;
  businessName: string | null;
  businessType: string | null;
  contactNumber: string | null;
  businessInfo: string | null;
  orderInfo: string | null;
  paymentInfo: string | null;
  deliveryInfo: string | null;
  additionalInfo: string | null;
  returnPolicy: string | null;
  exchangePolicy: string | null;
  refundPolicy: string | null;
  warranty: string | null;
  paymentNumber: string | null;
  codMessage: string | null;
  fullMessage: string | null;
  customInstructions: string | null;
  priceNegotiation: string | null;
}

export async function getActiveProducts(pageId: string) {
  return db
    .select()
    .from(products)
    .where(and(eq(products.pageId, pageId), eq(products.isActive, true)))
    .orderBy(asc(products.createdAt));
}

export async function buildPagePrompt(
  pageId: string,
  botConfig: BotConfigLike,
  opts?: {
    storeName?: string | null;
    customerName?: string | null;
    customerId?: string;
    messageText?: string | null;
    hasImages?: boolean;
    history?: HistoryMsgLike[];
    activeModules?: Set<PromptModule>;
    intent?: SalesIntent;
    targetProducts?: string[];
  }
): Promise<string> {
  const activeModules =
    opts?.activeModules ??
    detectRequiredModules(opts?.messageText, opts?.hasImages, opts?.history);

  const productRows = await getActiveProducts(pageId);
  const faqRows =
    opts?.intent === "policy_faq" || activeModules.has("policies_and_faq")
      ? await db
          .select()
          .from(faqs)
          .where(and(eq(faqs.pageId, pageId), eq(faqs.isActive, true)))
      : [];

  let prompt = buildSystemPrompt({
    botConfig,
    products: productRows,
    faqs: faqRows,
    storeName: opts?.storeName,
    customerName: opts?.customerName,
    activeModules,
    intent: opts?.intent,
    targetProducts: opts?.targetProducts,
  });

  if (opts?.customerId && opts.intent === "order_checkout") {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, opts.customerId))
      .orderBy(desc(orders.createdAt))
      .limit(1);
    if (order) {
      const lines = [
        order.customerName ? `Name: ${order.customerName}` : "",
        order.phone ? `Phone: ${order.phone}` : "",
        order.address ? `Address: ${order.address}` : "",
        order.productName ? `Product: ${order.productName}` : "",
        order.paymentMethod ? `Payment: ${order.paymentMethod}` : "",
        `Status: ${order.status}`,
      ].filter(Boolean);
      if (lines.length) {
        prompt += `\n\n## CUSTOMER'S LATEST ORDER\n${lines.join("\n")}`;
      }
    }
  }

  return prompt;
}
