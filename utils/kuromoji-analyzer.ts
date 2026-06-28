/**
 * Kuromoji-based Japanese morphological analyzer.
 *
 * Responsibilities:
 *  - Tokenize Japanese text into morphemes with accurate readings.
 *  - Provide `getWordAtCaret()` to replace the fragile backtrack-scan approach.
 *
 * Architecture:
 *  - Kuromoji handles tokenization + reading (IPAdic, context-aware).
 *  - JMdict (dict-ja.json) remains the source for meanings / translations.
 *  - Falls back to JMdict lookup if kuromoji fails to initialize.
 */

import kuromoji from 'kuromoji';

// ── State ────────────────────────────────────────────────────────────────────

let _tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;
let _initPromise: Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> | null = null;
let _initFailed = false;

// ── Initializer ──────────────────────────────────────────────────────────────

/**
 * Lazily initialise the Kuromoji tokenizer (once).
 * Dictionary files are served from the extension's public/data/kuromoji/ directory.
 */
export function initKuromoji(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  if (_tokenizer) return Promise.resolve(_tokenizer);
  if (_initPromise) return _initPromise;

  _initPromise = new Promise((resolve, reject) => {
    const dicPath = browser.runtime.getURL('/data/kuromoji/');

    kuromoji.builder({ dicPath }).build((err, tokenizer) => {
      if (err) {
        console.error('[Kuromoji] Failed to initialise:', err);
        _initFailed = true;
        reject(err);
      } else {
        console.log('[Kuromoji] Tokenizer ready.');
        _tokenizer = tokenizer;
        resolve(tokenizer);
      }
    });
  });

  return _initPromise;
}

export function isKuromojiReady(): boolean {
  return _tokenizer !== null;
}

export function isKuromojiFailed(): boolean {
  return _initFailed;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert katakana to hiragana (kuromoji returns readings in katakana). */
export function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// ── Core API ─────────────────────────────────────────────────────────────────

export interface KuromojiWord {
  /** Surface form exactly as it appears in the text. */
  word: string;
  /** Reading in hiragana (e.g. せつめい). Empty string if unknown. */
  reading: string;
  /** Start character offset inside the text node. */
  start: number;
  /** End character offset (exclusive) inside the text node. */
  end: number;
  /** Part of speech (e.g. 名詞, 動詞, 助詞 …). */
  pos: string;
}

/**
 * Tokenize `text` with Kuromoji and return the morpheme that contains
 * `caretOffset`. Returns `null` if:
 *  - kuromoji is not yet ready / failed.
 *  - The token at caret is a particle (助詞), auxiliary verb (助動詞), punctuation, etc.
 */
export function getWordAtCaret(text: string, caretOffset: number): KuromojiWord | null {
  if (!_tokenizer) return null;

  const tokens = _tokenizer.tokenize(text);

  let pos = 0;
  for (const token of tokens) {
    const start = pos;
    const end = pos + token.surface_form.length;

    if (caretOffset >= start && caretOffset < end) {
      const pos1 = token.pos;

      // Skip particles, auxiliary verbs, symbols, punctuation
      const skip = ['助詞', '助動詞', '記号', '補助記号', '空白'];
      if (skip.some((p) => pos1.startsWith(p))) {
        return null;
      }

      const rawReading = token.reading || '';
      return {
        word: token.surface_form,
        reading: rawReading && rawReading !== '*' ? katakanaToHiragana(rawReading) : '',
        start,
        end,
        pos: pos1,
      };
    }

    pos = end;
  }

  return null;
}
