/**
 * Rubi Japanese skip words list
 * These grammatical particles and extremely common functional words
 * do not need popup translations or annotations in general.
 */

const SKIP_WORDS_JA: string[] = [
  // ─── 助词 (Particles) ──────────────────────────────────
  "は", "が", "を", "に", "で", "と", "も", "へ", "の", 
  "から", "まで", "より", "ね", "よ", "か", "な", "ぞ", "さ",
  "だけ", "ばかり", "ほど", "くらい", "ぐらい", "など", "なり", "やら",
  "て", "で", "ば", "たら", "ても", "でも", "ながら", "つつ",

  // ─── 助动词 & 助动词变位 (Auxiliary Verbs & Copulas) ───────
  "だ", "です", "ます", "た", "だっ", "ない", "ず", "ぬ", "ん",
  "れる", "られる", "せる", "させる", "そう", "らしい",
  "ます", "ました", "ましょう", "ません", "ますか",
  "です", "でした", "でしょう", "ではありません", "じゃありません",

  // ─── 指示代词 & 疑问代词 (Pronouns & Indefinites) ─────────
  "これ", "それ", "あれ", "どれ",
  "この", "その", "あの", "どの",
  "ここ", "そこ", "あそこ", "どこ",
  "こちら", "そちら", "あちら", "どちら",
  "こっち", "そっち", "あっち", "どっち",
  "こう", "そう", "ああ", "どう",
  "何", "なに", "なん", "だれ", "誰",

  // ─── 其他基础副词 / 接续词 ────────────────────────────────
  "もう", "まだ", "また", "そして", "しかし", "でも", "だから", 
  "とても", "たいへん", "すごく", "ちょっと", "少し", "すこし"
];

export const skipWordsSetJa: Set<string> = new Set(
  SKIP_WORDS_JA.map((w) => w.trim())
);

/**
 * Checks if a Japanese word or grammatical token should be skipped for hover popup or annotation
 */
export function shouldSkipJa(word: string): boolean {
  const trimmed = word.trim();
  if (!trimmed) return true;
  
  // Skip if it's strictly a punctuation or whitespace
  if (/^[、。？！：；“”‘’（）［］｛｝〈〉《》「」『』【】〔〕└─────\s]+$/.test(trimmed)) {
    return true;
  }

  // Check if it exists in the skip words set
  return skipWordsSetJa.has(trimmed);
}
