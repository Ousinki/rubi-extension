import { isJapaneseChar } from './dom-ja';
import { safeSendMessage } from './content-messaging';
import type { WordSearchResult } from '../entrypoints/background/jpdict/search-result';

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

// We no longer load a local dictionary; everything is routed to the background script's jpdict-idb!
export async function loadDictionary(): Promise<Record<string, DictEntry>> {
  return {}; 
}

export function getDictionary(): Record<string, DictEntry> {
  return {};
}

export async function lookupWord(text: string): Promise<{ word: string; entry: DictEntry; length: number; reasonChains?: any } | null> {
  if (!text) return null;

  const cleaned = cleanJapaneseSearchText(text);
  if (!cleaned) return null;

  // Send request to background script which runs @birchill/jpdict-idb
  console.log(`[Rubi] lookupWord requesting SEARCH_WORD for: "${cleaned}"`);
  const resp = await safeSendMessage({
    type: 'SEARCH_WORD',
    text: cleaned
  });
  console.log(`[Rubi] lookupWord received resp for "${cleaned}":`, resp);

  if (resp && resp.success && resp.result) {
    const searchResult = resp.result as WordSearchResult;
    if (searchResult.data && searchResult.data.length > 0) {
      const firstHit = searchResult.data[0];
      console.log('[Rubi] firstHit from background:', firstHit);
      
      const reading = firstHit.r && firstHit.r.length > 0 ? (firstHit.r[0].ent || '') : '';
      const meanings = (firstHit.s || []).map(sense => {
        if (!sense.g) return '';
        return sense.g.map((g: any) => g.str || g).join(', ');
      }).filter(Boolean);

      return {
        word: text.substring(0, searchResult.matchLen),
        length: searchResult.matchLen,
        entry: {
          r: reading,
          m: meanings,
          j: '' // JLPT level is not provided directly in 10ten word match without extra lookup, skip for now
        }
      };
    }
  }

  return null;
}
