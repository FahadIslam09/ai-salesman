import { classifyCustomerIntent } from "./aiClassifierService";
import { buildSystemPrompt } from "../utils/prompt";

const dummyProducts = [
  { name: "Mens Premium Blank T-shirt", price: 550 },
  { name: "Slim Fit Formal Shirt", price: 1250 },
  { name: "Premium Cotton Panjabi", price: 1850 },
  { name: "Denim Jacket", price: 2200 },
];

const dummyConfig = {
  botConfig: {
    tone: "friendly",
    language: "auto",
    businessName: "Fashion Store",
  },
  products: dummyProducts.map((p) => ({
    name: p.name,
    price: p.price,
    description: "High quality premium fabric with longevity.",
    discount: 65,
    discountType: "fixed",
    variants: [{ color: "White" }, { color: "Black" }],
  })),
  faqs: [],
  storeName: "Fashion Store",
  customerName: "Fahad Islam",
};

const testMessages = [
  { msg: "ei tshirt 300 takai deya jabe?", label: "Lowball bargaining on T-shirt" },
  { msg: "kono formal shirt ache?", label: "Browsing formal shirts" },
  { msg: "dam koto panjabi er?", label: "Price inquiry for Panjabi" },
  { msg: "amar address Munnafer Mor, Rajshahi, phone 01712345678", label: "Checkout address and phone" },
  { msg: "1 ghonta por nok diyen", label: "Follow up postpone" },
];

async function run() {
  console.log("============== TWO-TIER ROUTER BENCHMARK ==============\n");
  for (const t of testMessages) {
    const start = Date.now();
    const result = await classifyCustomerIntent(t.msg, false, [], dummyProducts);
    const duration = Date.now() - start;

    const prompt = buildSystemPrompt({
      ...dummyConfig,
      activeModules: result.modules,
      targetProducts: result.targetProducts,
    });

    console.log(`[${t.label}]`);
    console.log(`Customer Message: "${t.msg}"`);
    console.log(`DeepSeek Latency: ${duration}ms | Tokens: In=${result.tokensIn}, Out=${result.tokensOut}`);
    console.log(`Intent Detected: ${result.intent}`);
    console.log(`Target Products: ${result.targetProducts.join(", ") || "None (Store-wide)"}`);
    console.log(`Active Modules: ${Array.from(result.modules).join(", ")}`);
    console.log(`Final Prompt to Luna: ${prompt.length} chars (~${Math.round(prompt.length / 3.5)} tokens)\n`);
  }
}

run().catch(console.error);
