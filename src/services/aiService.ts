import OpenAI from "openai";
import { env } from "../config/env";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.openrouterApiKey,
});

export interface AiReply {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

export interface HistoryMsg {
  role: "user" | "model";
  content: string;
}

export async function generateReply(systemPrompt: string, history: HistoryMsg[]): Promise<AiReply> {
  const res = await client.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({
        role: h.role === "model" ? ("assistant" as const) : ("user" as const),
        content: h.content,
      })),
    ],
    max_tokens: 1000,
  });
  return {
    text: res.choices[0]?.message?.content ?? "",
    tokensIn: res.usage?.prompt_tokens ?? 0,
    tokensOut: res.usage?.completion_tokens ?? 0,
  };
}

export async function generateReplyWithImages(
  systemPrompt: string,
  imagesBase64: string[],
  question?: string
): Promise<AiReply> {
  const content: any[] = imagesBase64.map((b64) => ({
    type: "image_url",
    image_url: { url: `data:image/jpeg;base64,${b64}` },
  }));
  if (question) content.push({ type: "text", text: question });

  const res = await client.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ],
    max_tokens: 1000,
  });
  return {
    text: res.choices[0]?.message?.content ?? "",
    tokensIn: res.usage?.prompt_tokens ?? 0,
    tokensOut: res.usage?.completion_tokens ?? 0,
  };
}
