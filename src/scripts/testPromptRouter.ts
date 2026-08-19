import { detectRequiredModules, buildSystemPrompt } from "../utils/prompt";

const dummyConfig = {
  botConfig: {
    tone: "friendly",
    language: "auto",
    businessName: "Fashion Store",
    orderInfo: "Name, phone, address needed",
    paymentInfo: "bKash, Nagad, Cash on Delivery",
    paymentNumber: "01700000000",
    deliveryInfo: "Inside Dhaka 60tk, Outside Dhaka 120tk",
    returnPolicy: "7 days return",
    exchangePolicy: "7 days exchange",
    refundPolicy: "Full refund upon return",
    warranty: "No warranty",
  },
  products: [
    {
      name: "Mens Premium Blank T-shirt",
      price: 550,
      discount: 65,
      discountType: "fixed",
      variants: [{ color: "White" }, { color: "Stormy Sea" }],
    },
    {
      name: "Slim Fit Formal Shirt",
      price: 1250,
      variants: [{ color: "Sky Blue" }],
    },
  ],
  faqs: [{ question: "Return policy?", answer: "7 days return if defect" }],
  storeName: "Fashion Store",
  customerName: "Fahad Islam",
};

const testCases = [
  { msg: "kono tshirt ache?", name: "1. General product inquiry" },
  { msg: "Mens Premium Blank T-shirt er dam koto?", name: "2. Price inquiry" },
  { msg: "300 takai hobe?", name: "3. Negotiation lowball" },
  { msg: "White color er chobi dekhano jabe?", name: "4. Photo request" },
  { msg: "amar address Munnafer Mor, Rajshahi, phone 01712345678", name: "5. Order and Address" },
  { msg: "1 ghonta por nok diyen", name: "6. Follow up delay" },
  { msg: "Product defect thakle return kora jabe?", name: "7. Policy and Return" },
  { msg: "dam koto ar delivery charge koto?", name: "8. Combined Price + Delivery" },
];

console.log("================ PROMPT ROUTER VERIFICATION ================\n");

for (const t of testCases) {
  const mods = detectRequiredModules(t.msg);
  const prompt = buildSystemPrompt({ ...dummyConfig, activeModules: mods });
  console.log(`[${t.name}]`);
  console.log(`Message: "${t.msg}"`);
  console.log(`Active Modules: ${Array.from(mods).join(", ")}`);
  console.log(`Prompt Length: ${prompt.length} chars (~${Math.round(prompt.length / 3.5)} tokens)\n`);
}

// Compare with full prompt (all modules active)
const allMods = new Set(["pricing_and_photos", "checkout_and_order", "follow_up", "policies_and_faq"] as const);
const fullPrompt = buildSystemPrompt({ ...dummyConfig, activeModules: allMods as any });
console.log(`[Full unmodularized prompt]`);
console.log(`Prompt Length: ${fullPrompt.length} chars (~${Math.round(fullPrompt.length / 3.5)} tokens)`);
