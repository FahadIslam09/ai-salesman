// Lightweight keyword detection for conversation attention flags.
// ponytail: no sentiment model call — free and instant; upgrade to AI
// classification if flags prove noisy in production.
const HUMAN = ["manager", "human", "real person", "agent", "কাস্টমার সার্ভিস", "সাপোর্ট", "এজেন্ট", "মানুষের"];
const ANGRY = ["angry", "stupid", "useless", "fraud", "cheat", "scam", "বাজে", "ধুর", "প্রতারণা", "ধোঁকা", "খারাপ সার্ভিস", "রিপান্ড"];
const PURCHASE = ["want to buy", "i will take", "i'll take", "buy it", "order now", "অর্ডার করব", "অর্ডার দিব", "নিতে চাই", "কিনবো", "আমি নিব", "কিনতে চাই", "নিবো"];

export function detectAttention(text: string): string | null {
  const t = text.toLowerCase();
  if (HUMAN.some((w) => t.includes(w))) return "human_requested";
  if (ANGRY.some((w) => t.includes(w))) return "angry";
  if (PURCHASE.some((w) => t.includes(w))) return "purchase_ready";
  return null;
}
