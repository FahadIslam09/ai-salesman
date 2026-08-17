import OpenAI from "openai";
import { env } from "../config/env";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.openrouterApiKey,
});

// GPT-5.6 Luna handles the customer-facing reply (text + image). Gemini
// handles voice transcription only.
const AUDIO_MODEL = "google/gemini-2.5-flash-lite";
const CHAT_MODEL = "openai/gpt-5.6-luna";

export interface AiReply {
  text: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
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

// Messenger renders plain text only — strip any Markdown and em/en dashes the
// model might emit.
function sanitizeText(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/[—–]/g, ", ")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

export async function generateReply(systemPrompt: string, history: HistoryMsg[]): Promise<AiReply> {
  const res = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [{ role: "system", content: systemPrompt }, ...toOpenAiMessages(history)],
    max_tokens: 1000,
  });
  return {
    text: sanitizeText(res.choices[0]?.message?.content ?? ""),
    tokensIn: res.usage?.prompt_tokens ?? 0,
    tokensOut: res.usage?.completion_tokens ?? 0,
    model: CHAT_MODEL,
  };
}

// GPT-5.6 Luna understands images natively, so this is a single call.
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
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...toOpenAiMessages(history),
      { role: "user", content },
    ],
    max_tokens: 1000,
  });
  return {
    text: sanitizeText(res.choices[0]?.message?.content ?? ""),
    tokensIn: res.usage?.prompt_tokens ?? 0,
    tokensOut: res.usage?.completion_tokens ?? 0,
    model: CHAT_MODEL,
  };
}

export async function transcribeAudio(buffer: Buffer, contentType: string): Promise<AiReply> {
  const base64 = buffer.toString("base64");
  const ct = contentType.toLowerCase();
  const format = ct.includes("wav")
    ? "wav"
    : ct.includes("mpeg") || ct.includes("mp3")
      ? "mp3"
      : ct.includes("aac")
        ? "aac"
        : ct.includes("ogg")
          ? "ogg"
          : ct.includes("flac")
            ? "flac"
            : "mp4";
  const res = await client.chat.completions.create({
    model: AUDIO_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe the following voice message verbatim. Output only the transcription text, nothing else." },
          { type: "input_audio", input_audio: { data: base64, format } } as any,
        ],
      },
    ],
    max_tokens: 1000,
  });
  return {
    text: res.choices[0]?.message?.content?.trim() ?? "",
    tokensIn: res.usage?.prompt_tokens ?? 0,
    tokensOut: res.usage?.completion_tokens ?? 0,
    model: AUDIO_MODEL,
  };
}
