import { isJapaneseChar } from './dom-ja';

export interface Segment {
  text: string;
  isWordLike: boolean;
  index: number;
}

export interface DictEntry {
  r: string;          // reading (furigana/kana)
  p?: number[];       // pitch accents (optional)
  m: string[];        // meanings (translations)
  j?: string;         // JLPT level (N5-N1) (optional)
}

let dictionary: Record<string, DictEntry> = {};
let loadingPromise: Promise<Record<string, DictEntry>> | null = null;

// Clean up search word by removing punctuation, spaces, and matching Japanese chars
export function cleanJapaneseSearchText(text: string): string {
  const result: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (isJapaneseChar(char) || /^[a-zA-Z0-9'-]$/.test(char)) {
      result.push(char);
    } else {
      break; // Stop at first non-word character (like punctuation or spaces)
    }
  }
  return result.join('');
}

// Native high-performance Japanese word segmentation using Intl.Segmenter
export function tokenizeJa(text: string): Segment[] {
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter('ja', { granularity: 'word' });
    const segments = segmenter.segment(text);
    return Array.from(segments).map((s: any) => ({
      text: s.segment,
      isWordLike: s.isWordLike,
      index: s.index,
    }));
  }

  // Fallback: simple character segmentation
  const result: Segment[] = [];
  let index = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result.push({
      text: char,
      isWordLike: isJapaneseChar(char) || /\w/.test(char),
      index: index++,
    });
  }
  return result;
}

// Lazy-loads the main Japanese dictionary from extension assets
export async function loadDictionary(): Promise<Record<string, DictEntry>> {
  if (Object.keys(dictionary).length > 0) {
    return dictionary;
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // Use standard browser API via WXT global import runtime
      const url = browser.runtime.getURL('/data/dict-ja.json');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      dictionary = await response.json();
      console.log(`[Rubi Dictionary] Loaded successfully. ${Object.keys(dictionary).length} entries.`);
    } catch (e) {
      console.error('[Rubi Dictionary] Failed to load dictionary:', e);
      dictionary = {};
    }
    return dictionary;
  })();

  return loadingPromise;
}

export function getDictionary(): Record<string, DictEntry> {
  return dictionary;
}

// Searches the dictionary using longest-match-first strategy
export function lookupWord(text: string): { word: string; entry: DictEntry; length: number } | null {
  if (!text) return null;

  const cleaned = cleanJapaneseSearchText(text);
  if (!cleaned) return null;

  // We match starting from the first hovered character
  // Japanese search text maximum matching window size: 12 chars
  for (let len = Math.min(cleaned.length, 12); len > 0; len--) {
    const word = cleaned.substring(0, len);
    if (dictionary[word]) {
      return {
        word,
        entry: dictionary[word],
        length: len
      };
    }
  }

  return null;
}
