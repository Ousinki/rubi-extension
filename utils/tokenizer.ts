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
  lemma?: string;     // Dictionary/prototype form (optional)
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

  console.log(`[Rubi] lookupWord requesting SEARCH_WORD and SEARCH_NAMES for: "${cleaned}"`);
  
  const [wordResp, nameResp] = await Promise.all([
    safeSendMessage({ type: 'SEARCH_WORD', text: cleaned }),
    safeSendMessage({ type: 'SEARCH_NAMES', text: cleaned })
  ]);

  let bestHit: any = null;
  let bestMatchLen = 0;
  let isName = false;

  if (wordResp && wordResp.success && wordResp.result && wordResp.result.data.length > 0) {
    bestHit = wordResp.result.data[0];
    bestMatchLen = wordResp.result.matchLen;
  }

  if (nameResp && nameResp.success && nameResp.result && nameResp.result.data.length > 0) {
    if (nameResp.result.matchLen > bestMatchLen) {
      bestHit = nameResp.result.data[0];
      bestMatchLen = nameResp.result.matchLen;
      isName = true;
    }
  }

  if (bestHit) {
    let reading = '';
    let meanings: string[] = [];
    let lemma = '';

    if (isName) {
      reading = bestHit.r && bestHit.r.length > 0 ? bestHit.r[0] : '';
      meanings = (bestHit.tr || []).map((tr: any) => {
        const type = tr.type && tr.type.length > 0 ? `[${tr.type.join(', ')}] ` : '';
        return `${type}${tr.det.join(', ')}`;
      });
      lemma = bestHit.k && bestHit.k.length > 0 ? bestHit.k[0] : (bestHit.r && bestHit.r.length > 0 ? bestHit.r[0] : '');
    } else {
      reading = bestHit.r && bestHit.r.length > 0 ? (bestHit.r[0].ent || '') : '';
      meanings = (bestHit.s || []).map((sense: any) => {
        if (!sense.g) return '';
        return sense.g.map((g: any) => g.str || g).join(', ');
      }).filter(Boolean);
      lemma = bestHit.k && bestHit.k.length > 0 ? (bestHit.k[0].ent || '') : (bestHit.r && bestHit.r.length > 0 ? (bestHit.r[0].ent || '') : '');
    }

    let etymology = '';
    if (!isName && bestHit.s) {
      // 1. Try to find lsrc (loan source)
      for (const sense of bestHit.s) {
        if (sense.lsrc && sense.lsrc.length > 0) {
          const validLsrc = sense.lsrc.find((l: any) => l.src);
          if (validLsrc && typeof validLsrc.src === 'string') {
            etymology = validLsrc.src;
          } else if (sense.g && sense.g.length > 0) {
            const firstGloss = sense.g[0];
            etymology = typeof firstGloss === 'string' ? firstGloss : (firstGloss.str || '');
          }
          if (etymology) break;
        }
      }

      // 2. Fallback: If no lsrc found, but the word is entirely Katakana, use the first gloss/meaning
      if (!etymology && lemma) {
        const isKatakanaWord = /^[\u30a0-\u30ffー]+$/.test(lemma);
        if (isKatakanaWord) {
          for (const sense of bestHit.s) {
            if (sense.g && sense.g.length > 0) {
              const firstGloss = sense.g[0];
              etymology = typeof firstGloss === 'string' ? firstGloss : (firstGloss.str || '');
              if (etymology) break;
            }
          }
        }
      }
    }

    if (etymology) {
      // Clean up parentheses, e.g. "accent (music)" -> "accent"
      etymology = etymology.replace(/\s*[\(（].*?[\)）]/g, '').trim();
      lemma = etymology;
    } else {
      const isSuruVerb = !isName && bestHit.s && bestHit.s.some((sense: any) => 
        sense.pos && sense.pos.some((pos: string) => pos.startsWith('vs'))
      );

      if (isSuruVerb && bestMatchLen > lemma.length) {
        lemma += 'する';
      }
    }

    if (!lemma) {
      lemma = text.substring(0, bestMatchLen);
    }

    return {
      word: text.substring(0, bestMatchLen),
      length: bestMatchLen,
      entry: {
        r: reading,
        m: meanings,
        j: '',
        lemma
      }
    };
  }

  return null;
}
