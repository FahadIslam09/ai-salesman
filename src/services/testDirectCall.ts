import axios from "axios";
import { env } from "../config/env";

export async function testDirectCall() {
  const start = Date.now();
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "deepseek/deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a classifier. Return JSON: {\"intent\":\"price_inquiry\",\"target_products\":[\"Mens Premium Blank T-shirt\"]}",
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
      timeout: 8000,
    }
  );
  console.log("Direct call SUCCESS in", Date.now() - start, "ms:");
  console.log(res.data.choices[0]?.message?.content);
}

testDirectCall().catch(console.error);
