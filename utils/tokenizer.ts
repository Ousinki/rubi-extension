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
  isAiFallback?: boolean; // True when entry was generated as an AI/katakana fallback, not from the local dict
}

export interface LookupResult {
  word: string;
  entry: DictEntry;
  length: number;
  reasonChains?: string[][];
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
  let cleaned = result.join('');
  // Convert half-width alphanumeric to full-width for better JMdict matching
  cleaned = cleaned.replace(/[a-zA-Z0-9]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
  return cleaned;
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

export function numberToHiragana(numStr: string): string {
  const cleanStr = numStr.replace(/,/g, '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  if (!/^\d+$/.test(cleanStr)) return '';

  const digits = ['ゼロ', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
  const units = ['', 'じゅう', 'ひゃく', 'せん'];
  const bigUnits = ['', 'まん', 'おく', 'ちょう', 'けい'];
  const specialCases: Record<string, string> = {
    'いちじゅう': 'じゅう', 'いちひゃく': 'ひゃく', 'いちせん': 'せん',
    'さんひゃく': 'さんびゃく', 'ろくひゃく': 'ろっぴゃく', 'はちひゃく': 'はっぴゃく',
    'さんせん': 'さんぜん', 'はちせん': 'はっせん'
  };

  let num = BigInt(cleanStr);
  if (num === 0n) return digits[0];

  let res = '';
  let bigUnitIdx = 0;

  while (num > 0n) {
    let chunk = Number(num % 10000n);
    num = num / 10000n;
    
    if (chunk > 0) {
      let chunkRes = '';
      for (let i = 0; i < 4; i++) {
        const d = Math.floor(chunk / Math.pow(10, i)) % 10;
        if (d > 0) {
          let part = digits[d] + units[i];
          if (specialCases[part]) part = specialCases[part];
          chunkRes = part + chunkRes;
        }
      }
      res = chunkRes + bigUnits[bigUnitIdx] + res;
    }
    bigUnitIdx++;
  }
  
  return res;
}

export function parseJapaneseNumberString(text: string): { word: string, reading: string, forceAiFallback?: boolean } | null {
  const match = text.match(/^([0-9０-９,]+(?:[万億兆])?)+/);
  if (!match || !/[0-9０-９]/.test(match[0])) return null;
  
  let word = match[0];
  let reading = '';
  
  // If the pure number is immediately followed by a Kanji or Kana (like a counter 階, 本, 人, 日)
  // we return null so the extension falls back to AI, which has perfect grammar rules for counters.
  if (text.length > word.length) {
    const nextChar = text[word.length];
    if (/[\u4e00-\u9faf\u3040-\u30ff]/.test(nextChar) && !/^[、。！？「」『』（）\[\]\sのにはがとでも]$/.test(nextChar)) {
      return { word: '', reading: '', forceAiFallback: true }; 
    }
  }
  
  // Parse chunks like "1億", "3,000万"
  const regex = /([0-9０-９,]+)([万億兆]?)/g;
  let m;
  let hasValidPart = false;
  
  while ((m = regex.exec(word)) !== null) {
    if (m[1]) {
      let r = numberToHiragana(m[1]);
      if (r) {
        hasValidPart = true;
        reading += r;
        if (m[2] === '万') reading += 'まん';
        else if (m[2] === '億') reading += 'おく';
        else if (m[2] === '兆') reading += 'ちょう';
      }
    }
  }
  
  if (!hasValidPart) return null;
  return { word, reading };
}

export function getDictionary(): Record<string, DictEntry> {
  return {};
}

export async function lookupWord(text: string, contextText: string = '', wordOffset: number = 0): Promise<LookupResult | null> {
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
    const matchLen = wordResp.result.matchLen;
    const matchedText = cleaned.substring(0, matchLen);
    
    // CRITICAL FIX: wordSearch returns matches for ALL prefix lengths mixed together!
    // We MUST filter out shorter matches (e.g. "二" len 1) if a longer match was found (e.g. "二つ" len 2).
    const validEntries = wordResp.result.data.filter((entry: any) => {
      const kMatch = entry.k && entry.k.some((k: any) => k.ent === matchedText);
      const rMatch = entry.r && entry.r.some((r: any) => r.ent === matchedText);
      return kMatch || rMatch;
    });

    console.log(`[Rubi] matchLen: ${matchLen}, matchedText: "${matchedText}"`);
    console.log(`[Rubi] wordResp.result.data.length: ${wordResp.result.data.length}`);
    console.log(`[Rubi] validEntries.length: ${validEntries.length}`);

    const entriesToUse = validEntries.length > 0 ? validEntries : wordResp.result.data;

    // Start with the default sort (priority-based) among the valid longest matches
    bestHit = entriesToUse[0];
    bestMatchLen = matchLen;
    console.log(`[Rubi] bestHit (initial):`, bestHit);

    // Use Kuromoji for true context-aware morphological disambiguation
    if (contextText) {
      try {
        const kuromojiResp = await safeSendMessage({ type: 'KUROMOJI_PARSE', text: contextText });
        if (kuromojiResp && kuromojiResp.success && kuromojiResp.result) {
          const tokens = kuromojiResp.result;
          
          // Find the token that overlaps with wordOffset
          const targetToken = tokens.find((t: any) => {
            const start = t.word_position - 1;
            const end = start + t.surface_form.length;
            return wordOffset >= start && wordOffset < end;
          });

          if (targetToken && targetToken.reading) {
            // Kuromoji returns Katakana reading, convert it to Hiragana for JMdict matching
            const expectedHiragana = targetToken.reading.replace(/[\u30A1-\u30F6]/g, (match: string) => 
              String.fromCharCode(match.charCodeAt(0) - 0x60)
            );
            
            console.log(`[Rubi] Kuromoji context analysis for "${targetToken.surface_form}": ${expectedHiragana}`);
            
            // Find a JMdict entry that matches this exact context reading AMONG THE LONGEST MATCHES
            const contextuallyMatchedEntry = entriesToUse.find((entry: any) => {
              return entry.r && entry.r.some((r: any) => r.ent === expectedHiragana);
            });
            
            if (contextuallyMatchedEntry) {
              console.log(`[Rubi] Kuromoji successfully disambiguated to: ${expectedHiragana}`);
              
              // CRITICAL FIX: Only overwrite bestHit if the Kuromoji token is the primary root word,
              // not a conjugated suffix of a longer JpdictIdb match.
              if (targetToken.surface_form.length >= bestMatchLen || bestMatchLen <= 1 || targetToken.pos === '名詞') {
                bestHit = contextuallyMatchedEntry;
              }
              
              // Ensure we set the Kana match flag so lemma extraction picks up the correct reading
              const exactReading = contextuallyMatchedEntry.r.find((r: any) => r.ent === expectedHiragana);
              if (exactReading) exactReading.match = true;
            } else {
              console.log(`[Rubi] Kuromoji returned ${expectedHiragana}, but no matching entry found in JMdict for the matched length.`);
            }
          }
        }
      } catch (err) {
        console.warn('[Rubi] Kuromoji parse failed, falling back to JMdict default sort:', err);
      }
    }
  }

  if (nameResp && nameResp.success && nameResp.result && nameResp.result.data.length > 0) {
    if (nameResp.result.matchLen > bestMatchLen) {
      bestHit = nameResp.result.data[0];
      bestMatchLen = nameResp.result.matchLen;
      isName = true;
    }
  }

  // Check custom number parser
  const numParsed = parseJapaneseNumberString(text);
  if (numParsed) {
    if (numParsed.forceAiFallback) {
      return null; // Ignore JMdict, force AI fallback to handle counters perfectly
    }
    if (numParsed.word.length > 0) {
      if (!bestHit || numParsed.word.length > bestMatchLen) {
        return {
          word: numParsed.word,
          length: numParsed.word.length,
          entry: {
            r: numParsed.reading,
            m: ['(Number)'],
            j: '',
            lemma: numParsed.word
          }
        };
      }
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
      const matchedKanji = bestHit.k?.find((k: any) => k.match);
      const matchedKana = bestHit.r?.find((r: any) => r.match);
      
      reading = matchedKana ? matchedKana.ent : (bestHit.r && bestHit.r.length > 0 ? (bestHit.r[0].ent || '') : '');
      lemma = matchedKanji ? matchedKanji.ent : (bestHit.k && bestHit.k.length > 0 ? (bestHit.k[0].ent || '') : (reading || ''));
      
      meanings = (bestHit.s || []).map((sense: any) => {
        if (!sense.g) return '';
        return sense.g.map((g: any) => g.str || g).join(', ');
      }).filter(Boolean);
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
        if (!reading.endsWith('する')) {
          reading += 'する';
        }
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
