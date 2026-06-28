/**
 * Build script: converts jmdict-all-3.6.x.json (JMdict Simplified format)
 * into the compact dict-ja.json format used by Rubi extension.
 *
 * Output format per entry:
 *   "KANJI": { r: "reading", m: ["meaning1", "meaning2"], j: "N3" }
 *
 * Usage:
 *   node scripts/build-dict.mjs /tmp/jmdict-all-3.6.2.json public/data/dict-ja.json
 *
 * Run options:
 *   --max-entries N   limit output (default: unlimited)
 *   --min-jlpt N5     only include up to this JLPT level (default: all)
 */

import { readFileSync, writeFileSync } from 'fs';

const srcPath = process.argv[2] || '/tmp/jmdict-all-3.6.2.json';
const outPath = process.argv[3] || 'public/data/dict-ja.json';
const MAX_MEANINGS = 4; // Max Chinese/English meanings to keep per entry

console.log(`[build-dict] Reading ${srcPath} ...`);
const raw = JSON.parse(readFileSync(srcPath, 'utf-8'));
const words = raw.words;
console.log(`[build-dict] Total JMdict entries: ${words.length}`);

// JLPT priority order (N5 = most common)
const JLPT_ORDER = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };

const out = {};
let count = 0;

for (const word of words) {
  // ── 1. Pick the best kanji headword ──────────────────────────
  // Prefer the most common form (lowest priority number = most common)
  const kanjiList = word.kanji || [];
  const kanaList = word.kana || [];

  if (kanaList.length === 0) continue;

  // Pick the primary reading (first non-rare kana form)
  const primaryKana = kanaList.find(k => !k.tags?.includes('rk') && !k.tags?.includes('ok')) || kanaList[0];
  const readingStr = primaryKana.text;

  // Determine headword: kanji form if present, else kana form
  const headwords = kanjiList.length > 0
    ? kanjiList.filter(k => !k.tags?.includes('rk') && !k.tags?.includes('ok'))
    : [primaryKana];

  if (headwords.length === 0) continue;

  // ── 2. Extract JLPT level ────────────────────────────────────
  const tags = word.sense?.flatMap(s => s.misc || []) || [];
  let jlpt = null;
  // JMdict simplified stores JLPT in word-level `jlpt` field
  if (word.jlpt && word.jlpt.length > 0) {
    jlpt = word.jlpt[0].toUpperCase(); // e.g. "n5" -> "N5"
  }

  // ── 3. Extract meanings (prefer Chinese, fallback to English) ─
  const allSenses = word.sense || [];
  const meanings = [];

  for (const sense of allSenses) {
    const glosses = sense.gloss || [];
    // Chinese Simplified: lang == "zhs"
    const zhGlosses = glosses.filter(g => g.lang === 'zhs');
    if (zhGlosses.length > 0) {
      for (const g of zhGlosses) {
        if (!meanings.includes(g.text)) meanings.push(g.text);
      }
    } else {
      // Fallback to English
      const enGlosses = glosses.filter(g => !g.lang || g.lang === 'eng');
      for (const g of enGlosses.slice(0, 2)) {
        if (!meanings.includes(g.text)) meanings.push(g.text);
      }
    }
    if (meanings.length >= MAX_MEANINGS) break;
  }

  if (meanings.length === 0) continue;

  // ── 4. Write entries for each headword ───────────────────────
  for (const hw of headwords) {
    const key = hw.text;
    if (!key || key.length === 0) continue;

    // Don't overwrite a higher-quality existing entry
    if (out[key]) continue;

    const entry = {
      r: readingStr,
      m: meanings.slice(0, MAX_MEANINGS),
    };
    if (jlpt) entry.j = jlpt;

    out[key] = entry;
    count++;
  }

  // Also index by kana form (for hiragana-only text lookups)
  if (kanjiList.length > 0 && !out[readingStr]) {
    out[readingStr] = {
      r: readingStr,
      m: meanings.slice(0, MAX_MEANINGS),
      ...(jlpt ? { j: jlpt } : {}),
    };
    count++;
  }
}

console.log(`[build-dict] Writing ${count} entries to ${outPath} ...`);
writeFileSync(outPath, JSON.stringify(out));
console.log(`[build-dict] Done! Output size: ${Math.round(JSON.stringify(out).length / 1024)} KB`);
