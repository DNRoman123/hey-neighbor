/**
 * Content safety helpers.
 *
 * Hey Neighbor does not allow profanity, sexual language or explicit /
 * nude imagery anywhere in the app. Text is checked here in the app and
 * again by a database trigger, so nothing slips through.
 */

const BANNED_WORDS = [
  // English profanity
  "fuck", "fucking", "fucker", "motherfucker", "shit", "bullshit", "bitch",
  "bastard", "asshole", "arsehole", "dickhead", "cunt", "whore", "slut",
  "pussy", "cock", "dick", "wank", "twat", "nigger", "nigga", "faggot",
  "fag", "retard",
  // Sexual / nudity
  "porn", "porno", "pornhub", "pornography", "nude", "nudes", "nudity",
  "naked", "sex", "sexy", "sexual", "horny", "blowjob", "handjob", "anal",
  "orgasm", "masturbate", "masturbation", "dildo", "cum", "boobs", "tits",
  "titty", "penis", "vagina", "escort", "hooker", "prostitute", "onlyfans",
  "nsfw", "xxx",
  // Spanish
  "puta", "puto", "mierda", "joder", "cabron", "cabrón", "pendejo", "coño",
  "polla", "verga", "chinga", "chingar", "pinche", "zorra", "perra",
  "maricon", "maricón", "culo", "tetas", "pito", "desnudo", "desnuda",
  "desnudos", "desnudas", "sexo", "follar", "prostituta",
];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
  "@": "a", "$": "s", "!": "i", "*": " ",
};

function normalize(text: string) {
  const lowered = text.toLowerCase();
  let out = "";
  for (const char of lowered) out += LEET[char] ?? char;
  return out
    .replace(/[^a-záéíóúñü]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the text contains profanity or sexual language. */
export function containsBannedWords(text?: string | null) {
  if (!text) return false;
  const words = new Set(normalize(text).split(" "));
  return BANNED_WORDS.some((word) => words.has(word) || words.has(`${word}s`));
}

/** Returns the first offending field, or null when everything is clean. */
export function firstBannedField(fields: Record<string, string | null | undefined>) {
  for (const [field, value] of Object.entries(fields)) {
    if (containsBannedWords(value)) return field;
  }
  return null;
}

export const LANGUAGE_BLOCKED_MESSAGE =
  "Please remove offensive or sexual language before continuing.";

export const IMAGE_BLOCKED_MESSAGE =
  "That photo looks unsafe. Nudity, sexual or explicit images are not allowed.";

/** Maps a database guard error into a friendly message. */
export function moderationErrorMessage(error: unknown) {
  const message = String((error as { message?: string })?.message ?? error ?? "");
  if (message.includes("INAPPROPRIATE_LANGUAGE")) return LANGUAGE_BLOCKED_MESSAGE;
  if (message.includes("BLOCKED_CONVERSATION"))
    return "You can't message this neighbor because one of you blocked the other.";
  return null;
}
