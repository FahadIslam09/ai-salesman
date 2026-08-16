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

export interface ImageInput {
  base64: string;
  mime: string;
}

function toOpenAiMessages(history: HistoryMsg[]) {
  return history.map((h) => ({
    role: h.role === "model" ? ("assistant" as const) : ("user" as const),
    content: h.content,
  }));
}

export async function generateReply(systemPrompt: string, history: HistoryMsg[]): Promise<AiReply> {
  const res = await client.chat.completions.create({
    model: "google/gemini-2.5-flash-lite",
    messages: [{ role: "system", content: systemPrompt }, ...toOpenAiMessages(history)],
    max_tokens: 1000,
  });
  return {
    text: res.choices[0]?.message?.content ?? "",
    tokensIn: res.usage?.prompt_tokens ?? 0,
    tokensOut: res.usage?.completion_tokens ?? 0,
  };
}

// Keeps chat history so image turns don't lose conversation context.
export async function generateReplyWithImages(
  systemPrompt: string,
  images: ImageInput[],
  question?: string,
  history: HistoryMsg[] = []
): Promise<AiReply> {
  const content: any[] = images.map((img) => ({
    type: "image_url",
    image_url: { url: `data:${img.mime};base64,${img.base64}` },
  }));
  if (question) content.push({ type: "text", text: question });

  const res = await client.chat.completions.create({
    model: "google/gemini-2.5-flash-lite",
    messages: [
      { role: "system", content: systemPrompt },
      ...toOpenAiMessages(history),
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
