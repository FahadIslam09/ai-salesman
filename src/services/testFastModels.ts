import axios from "axios";
import { env } from "../config/env";

const modelsToTest = [
  "google/gemini-2.5-flash-lite",
  "meta-llama/llama-3.2-3b-instruct",
  "qwen/qwen-2.5-7b-instruct",
  "mistralai/mistral-7b-instruct",
];

async function benchmark() {
  for (const model of modelsToTest) {
    const start = Date.now();
    try {
      const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model,
          messages: [
            {
              role: "system",
              content:
                "Identify intent (browsing, price_inquiry, negotiation, order_checkout) and target product. Return strict JSON: {\"intent\":\"negotiation\",\"target_products\":[\"Mens Premium Blank T-shirt\"]}",
            },
            { role: "user", content: "ei tshirt 300 takai deya jabe?" },
          ],
          response_format: { type: "json_object" },
          max_tokens: 100,
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${env.openrouterApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 6000,
        }
      );
      console.log(`[${model}] -> SUCCESS in ${Date.now() - start}ms:`, res.data.choices[0]?.message?.content);
    } catch (err: any) {
      console.log(`[${model}] -> FAIL in ${Date.now() - start}ms:`, err.response?.data?.error?.message || err.message);
    }
  }
}

benchmark().catch(console.error);
