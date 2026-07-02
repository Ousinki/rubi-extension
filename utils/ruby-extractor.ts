// Advanced furigana extractor: builds a kanji-to-reading map from the dictionary lemma,
// then applies it to the user's text word. This handles multiple kanji blocks and okurigana mismatches.
export const extractRuby = (word: string, displayReading: string, lemma: string, isAiFallback = false) => {
  if (!word) return { chunks: [], reading: '', wStart: 0, wEnd: -1 };

  // CRITICAL: Immediately format AI Fallback strings so they reliably show the '...' loading UI
  if (isAiFallback) {
      return {
          chunks: [{ text: word, reading: '...', startIdx: 0, endIdx: word.length - 1 }],
          wStart: 0,
          wEnd: word.length - 1
      };
  }
  
  const isPureKatakana = /^[\u30A1-\u30F6\u30FC\s・]+$/.test(word);

  if (!displayReading && !isAiFallback) {
      if (!/[\u4e00-\u9faf\d０-９]/.test(word) && !isPureKatakana) {
          return { chunks: [], reading: '', wStart: 0, wEnd: -1 };
      }
  }
  
  // Special case: Pure Katakana word gets the whole reading (e.g. English etymology)
  if (isPureKatakana) {
      return {
          chunks: [{ text: word, reading: isAiFallback ? '...' : displayReading, startIdx: 0, endIdx: word.length - 1 }],
          wStart: 0,
          wEnd: word.length - 1
      };
  }
  
  const getKanjiReadingMap = (lStr: string, rStr: string): Record<string, string> => {
    if (!lStr || !rStr) return {};
    
    // Helper to convert katakana to hiragana for comparison
    const toHiragana = (s: string) => s.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
    const hRStr = toHiragana(rStr);
    
    const allocate = (l: string, r: string): Record<string, string> => {
      if (!l) return {};
      
      const kanaMatch = l.match(/[\u3040-\u30ff]+/);
      if (!kanaMatch) {
          if (l.trim()) return { [l]: r };
          return {};
      }
      
      const kana = kanaMatch[0];
      const hKana = toHiragana(kana);
      const kanaIdx = l.indexOf(kana);
      
      const kanjiBlock = l.substring(0, kanaIdx);
      const restL = l.substring(kanaIdx + kana.length);
      
      let rKanaIdx = r.indexOf(hKana);
      // Kanji reading must be at least 1 char per kanji, skip early matches
      while (rKanaIdx !== -1 && rKanaIdx < kanjiBlock.length) {
            rKanaIdx = r.indexOf(hKana, rKanaIdx + 1);
      }
      
      if (rKanaIdx === -1) {
            if (kanjiBlock.trim()) return { [l]: r };
            return {};
      }
      
      const kanjiReading = r.substring(0, rKanaIdx);
      const restR = r.substring(rKanaIdx + hKana.length);
      
      const map: Record<string, string> = {};
      if (kanjiBlock.trim()) map[kanjiBlock] = kanjiReading;
      
      Object.assign(map, allocate(restL, restR));
      return map;
    };
    
    // Strip matching suffix
    let lEnd = lStr.length - 1;
    let rEnd = rStr.length - 1;
    while (lEnd >= 0 && rEnd >= 0 && toHiragana(lStr[lEnd]) === toHiragana(rStr[rEnd])) {
        lEnd--;
        rEnd--;
    }
    
    return allocate(lStr.substring(0, lEnd + 1), rStr.substring(0, rEnd + 1));
  };

  let map: Record<string, string> = {};
  if (!isAiFallback) {
      map = getKanjiReadingMap(lemma, displayReading);
  }
  
  // Hardcode irregular verb '来る' to handle conjugations accurately
  if (lemma === '来る' || lemma === '來る') {
      if (word.startsWith('来な') || word.startsWith('来れ') || word.startsWith('来よ') || word.startsWith('来い') || word.startsWith('来ら')) map['来'] = 'こ';
      else if (word.startsWith('来ま') || word.startsWith('来て') || word.startsWith('来た') || word.startsWith('来き') || word.startsWith('来てい')) map['来'] = 'き';
      else map['来'] = 'く';
  }
  
  // Find first and last kanji/digit in the TEXT word to anchor the ruby
  let firstKanjiIdx = 0;
  while (firstKanjiIdx < word.length && !/[\u4e00-\u9faf\d０-９,.]/.test(word[firstKanjiIdx])) firstKanjiIdx++;
  
  let lastKanjiIdx = word.length - 1;
  while (lastKanjiIdx >= 0 && !/[\u4e00-\u9faf\d０-９,.]/.test(word[lastKanjiIdx])) lastKanjiIdx--;
  
  if (firstKanjiIdx > lastKanjiIdx) return { chunks: [], reading: '', wStart: 0, wEnd: -1 };
  
  const wStart = firstKanjiIdx;
  const wEnd = lastKanjiIdx;
  
  let chunks: { text: string, reading: string, startIdx: number, endIdx: number }[] = [];
  
  let i = wStart;
  while (i <= wEnd) {
      let kanjiChunk = '';
      let lemmaChunk = '';
      let startIdx = i;
      while (i <= wEnd && /[\u4e00-\u9faf\d０-９,.]/.test(word[i])) {
          kanjiChunk += word[i];
          if (lemma && i < lemma.length) lemmaChunk += lemma[i];
          i++;
      }
      if (kanjiChunk) {
          let reading = '';
          if (isAiFallback) {
              reading = '...';
          } else {
              if (lemmaChunk && map[lemmaChunk]) {
                  reading = map[lemmaChunk];
              } else if (map[kanjiChunk]) {
                  reading = map[kanjiChunk];
              } else {
                  for (let j = 0; j < kanjiChunk.length; j++) {
                      const char = kanjiChunk[j];
                      const lChar = lemmaChunk[j];
                      reading += (lChar && map[lChar]) || map[char] || char;
                  }
              }
          }
          if (reading && reading !== kanjiChunk) {
              chunks.push({ text: kanjiChunk, reading, startIdx, endIdx: i - 1 });
          }
      }
      
      while (i <= wEnd && !/[\u4e00-\u9faf\d０-９,.]/.test(word[i])) {
          i++;
      }
  }
  
  return { chunks, wStart, wEnd };
};
