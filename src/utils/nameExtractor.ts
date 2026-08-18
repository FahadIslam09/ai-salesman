// Utility to extract customer names from Facebook Messenger auto-reply greetings and salutations.

const GREETING_STOPWORDS = new Set([
  "there",
  "everyone",
  "friend",
  "friends",
  "customer",
  "customers",
  "all",
  "sir",
  "madam",
  "someone",
  "you",
  "brother",
  "sister",
  "bro",
  "sis",
  "vai",
  "bhai",
  "apu",
  "bhaiya",
  "apuni",
  "apna",
  "apnader",
  "apni",
  "tumi",
  "toder",
  "ভাই",
  "আপু",
  "ভাইয়া",
  "বন্ধু",
  "স্যার",
  "ম্যাডাম",
  "কাস্টমার",
  "page",
  "admin",
  "team",
  "support",
]);

function isValidName(name: string): boolean {
  if (!name) return false;
  // Strip trailing or leading punctuation
  const clean = name.replace(/^[,.\s!?:;'"-]+|[,.\s!?:;'"-]+$/g, "").trim();
  if (clean.length < 2 || clean.length > 50) return false;

  const lower = clean.toLowerCase();
  if (GREETING_STOPWORDS.has(lower)) return false;

  // Must contain Latin or Bengali letters
  if (!/[A-Za-z\u0980-\u09FF]/.test(clean)) return false;

  // Reject URLs, numbers or email
  if (/^(https?:\/\/|www\.|[0-9+@]+$)/i.test(clean)) return false;

  // Reject long sentences (names are usually 1 to 5 words)
  const words = clean.split(/\s+/);
  if (words.length > 5) return false;

  return true;
}

/**
 * Extracts the recipient's name from automated Facebook greetings or salutations.
 * Examples:
 *  - "Hi HA Sib Reza, Thanks for reaching out to us." -> "HA Sib Reza"
 *  - "Hello Fahad Islam! How can we help?" -> "Fahad Islam"
 *  - "হ্যালো তানভীর আহমেদ, নকশা ফ্যাশনে স্বাগতম" -> "তানভীর আহমেদ"
 *  - "আসসালামু আলাইকুম মো: রফিকুল ইসলাম! ..." -> "মো: রফিকুল ইসলাম"
 */
export function extractNameFromGreeting(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const clean = text.trim();

  // Pattern 1: Leading Salutation
  // Matches "Hi <Name>,", "Hello <Name>!", "আসসালামু আলাইকুম <Name>,", etc.
  const salutationRegex =
    /^(?:Hi|Hello|Hey|Dear|Salam|Assalamu\s+Alaikum|Assalamualaikom|Assalam-o-Alaikum|আসসালামু\s*আলাইকুম|হ্যালো|হাই|সালাম)\s+([A-Za-z\u0980-\u09FF\s.'-:০-৯]+?)(?:,|\!|\.|\?|\n|,\s*thanks|,\s*thank|\s+thanks|\s+thank|\s*-\s*|\s+স্বাগতম|\s+welcome|$)/i;

  const match1 = clean.match(salutationRegex);
  if (match1 && match1[1]) {
    const rawName = match1[1].replace(/^[,.\s!?:;'"-]+|[,.\s!?:;'"-]+$/g, "").trim();
    if (isValidName(rawName)) {
      return rawName;
    }
  }

  // Pattern 2: Trailing Name
  // Matches "Thanks for reaching out to us, <Name>!"
  const suffixRegex =
    /(?:thanks for reaching out to us|thank you for reaching out to us|thanks for messaging us|thank you for contacting us|স্বাগতম),?\s+([A-Za-z\u0980-\u09FF\s.'-:০-৯]+?)[\.!\?]?$/i;
  const match2 = clean.match(suffixRegex);
  if (match2 && match2[1]) {
    const rawName = match2[1].replace(/^[,.\s!?:;'"-]+|[,.\s!?:;'"-]+$/g, "").trim();
    if (isValidName(rawName)) {
      return rawName;
    }
  }

  return null;
}
