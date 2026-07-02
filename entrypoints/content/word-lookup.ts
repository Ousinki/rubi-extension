/**
 * Rubi Word Lookup & Highlighting Controller
 *
 * Implements mouse-hover translation lookup, CSS Custom Highlight injection,
 * and handles UI badges rendering (pronounce badge / translation badge).
 */

import { uiActions, uiState, type RubyChunkState } from '@/utils/content-state';
import { settingsStorage } from '@/utils/storage';
import { loadDictionary, lookupWord, type DictEntry, type LookupResult } from '@/utils/tokenizer';
import { extractRuby } from '@/utils/ruby-extractor';
import { safeSendMessage } from '@/utils/content-messaging';
import { speakText } from '@/utils/tts';
import { getTextAtPoint } from '@/utils/10ten/get-text';
import { currentSettings } from './content-context';
import { getEffectiveFuriganaState } from './furigana-injector';

// ─── Shared State ─────────────────────────────────────────────

export let currentWord: string | null = null;
export let currentHighlightedRanges: Range[] | null = null;
export let currentMatchedEntry: DictEntry | null = null;
export let currentWordIsAiFallback = false;
export let isMouseOverPopup = false;
export let hoverTimer: ReturnType<typeof setTimeout> | null = null;
export let activeUpdateDynamicReading: ((reading: string) => void) | null = null;

export function setCurrentWord(val: string | null) { currentWord = val; }
export function setCurrentHighlightedRanges(val: Range[] | null) { currentHighlightedRanges = val; }
export function setCurrentMatchedEntry(val: DictEntry | null) { currentMatchedEntry = val; }
export function setCurrentWordIsAiFallback(val: boolean) { currentWordIsAiFallback = val; }
export function setIsMouseOverPopup(val: boolean) { isMouseOverPopup = val; }
export function setHoverTimer(val: ReturnType<typeof setTimeout> | null) { hoverTimer = val; }

// ─── Highlight and Timer Helpers ──────────────────────────────

export function clearHoverHighlight() {
  if (typeof (CSS as any) !== 'undefined' && (CSS as any).highlights) {
    (CSS as any).highlights.delete('rubi-hover-highlight');
  }
  currentHighlightedRanges = null;
  currentWord = null;
  currentWordIsAiFallback = false;
}

export function immediateHide() {
  if (isMouseOverPopup) return; // Don't hide if mouse is still over the popup
  if (uiState.translationBadge.pinned) return; // Don't hide pinned (AI mode) badge
  cancelScheduledHide();
  clearHoverHighlight();
  if (!uiState.pronounceBadge.pinned) uiActions.hidePronounceBadge();
  if (!uiState.translationBadge.pinned) uiActions.hideTranslationBadge();
}

export function scheduleHide() {
  if (hoverTimer) return;
  hoverTimer = setTimeout(() => {
    if (!isMouseOverPopup) {
      if (uiState.translationBadge.pinned) {
        hoverTimer = null;
        return;
      }
      clearHoverHighlight();
      if (!uiState.pronounceBadge.pinned) uiActions.hidePronounceBadge();
      uiActions.hideTranslationBadge();
    }
    hoverTimer = null;
  }, 300);
}

export function cancelScheduledHide() {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
}

export function scheduleHidePopup() {
  isMouseOverPopup = false;
  scheduleHide();
}

// ─── Word Sourcing & Highlighting ───────────────────────────

export function getFallbackWordLength(text: string): number {
  if (!text) return 0;
  
  // Smart number matching: Digits + Optional Counter (Kanji/Kana/Letters/%)
  const numberMatch = text.match(/^([0-9０-９,\.]+(?:[万億兆])?)+(?:(?:(?!以上|以下|未満)[\u4e00-\u9faf]){1,2}|[ヶヵ][\u4e00-\u9faf]|[a-zA-Z]+|%|％|つ|えん)?/);
  if (numberMatch && /^[0-9０-９]/.test(text)) {
    return numberMatch[0].length;
  }
  
  const katakanaMatch = text.match(/^[\u30a0-\u30ffー]+/);
  if (katakanaMatch) {
    return katakanaMatch[0].length;
  }
  
  const kanjiMatch = text.match(/^[\u4e00-\u9fff]+/);
  if (kanjiMatch) {
    return kanjiMatch[0].length;
  }
  
  const generalMatch = text.match(/^[^\s、。！？\[\]\(\)\{\}「」『』のには加とでも]+/);
  if (generalMatch) {
    return Math.min(generalMatch[0].length, 6);
  }
  
  return 1;
}

export async function handleMouseMove(e: MouseEvent) {
  if (uiState.translationBadge.pinned) return;

  try {
    await loadDictionary();

    const scanResult = getTextAtPoint({
      point: { x: e.clientX, y: e.clientY },
      maxLength: 32
    });

    if (!scanResult || !scanResult.text || !scanResult.textRange) {
      immediateHide();
      return;
    }

    let matchedWord: string | null = null;
    let matchedReading: string = '';
    let matchedEntry: DictEntry | null = null;
    let matchedLength = -1;
    let isAiFallback = false;

    let contextText = scanResult.text;
    let wordOffset = 0;
    if (scanResult.textRange && scanResult.textRange.length > 0) {
      const firstRange = scanResult.textRange[0];
      if (firstRange.node && firstRange.node.textContent) {
        contextText = firstRange.node.textContent;
        wordOffset = firstRange.start;
      }
    }

    const match: LookupResult | null = await lookupWord(scanResult.text, contextText, wordOffset);
    
    if (match) {
      matchedWord = match.word;
      matchedEntry = match.entry;
      matchedLength = match.length;
    }

    const startsWithKatakana = /^[\u30a0-\u30ffー]/.test(scanResult.text);
    const startsWithKanji = /^[\u4e00-\u9fff]/.test(scanResult.text);
    const startsWithNumber = /^[0-9０-９]/.test(scanResult.text);

    const katakanaBlockLen = startsWithKatakana ? (scanResult.text.match(/^[\u30a0-\u30ffー]+/)?.[0].length || 0) : 0;
    
    // Force AI fallback for all pure Katakana to retrieve English Etymology instead of local kana reading
    if (katakanaBlockLen > 0 && matchedLength <= katakanaBlockLen) {
      isAiFallback = true;
    } else if (!match && (startsWithKatakana || startsWithKanji || startsWithNumber)) {
      isAiFallback = true;
    }

    if (isAiFallback) {
      const fallbackLen = getFallbackWordLength(scanResult.text);
      if (fallbackLen > 0) {
        matchedWord = scanResult.text.substring(0, fallbackLen);
        matchedLength = fallbackLen;
        matchedReading = '';
        matchedEntry = {
          r: '',
          m: [],
          lemma: matchedWord,
          isAiFallback: true
        };
        currentWordIsAiFallback = true;
      } else {
        matchedWord = null;
        currentWordIsAiFallback = false;
      }
    } else {
      currentWordIsAiFallback = false;
    }

    if (matchedEntry && !isAiFallback) {
      matchedReading = matchedEntry.r || '';
    }

    if (matchedWord) {
      currentMatchedEntry = matchedEntry;

      // Check if it's the exact same word and range
      if (currentWord === matchedWord && currentHighlightedRanges && currentHighlightedRanges.length > 0) {
        if (currentHighlightedRanges[0].startContainer === scanResult.textRange[0].node &&
            currentHighlightedRanges[0].startOffset === scanResult.textRange[0].start) {
          cancelScheduledHide();
          return;
        }
      }

      // Build multiple disjoint ranges to avoid highlighting superscripts/ruby in between
      const ranges: Range[] = [];
      let currentLen = 0;
      
      for (const textRange of scanResult.textRange) {
        const segLen = textRange.end - textRange.start;
        const range = document.createRange();
        
        if (currentLen + segLen >= matchedLength) {
          const remaining = matchedLength - currentLen;
          range.setStart(textRange.node, textRange.start);
          range.setEnd(textRange.node, textRange.start + remaining);
          if (remaining > 0) ranges.push(range);
          break;
        }
        
        range.setStart(textRange.node, textRange.start);
        range.setEnd(textRange.node, textRange.end);
        if (segLen > 0) ranges.push(range);
        currentLen += segLen;
      }

      if (ranges.length === 0) return;

      let isOverWord = false;
      const padding = 6;
      let targetRect: DOMRect | null = null;
      let targetRange: Range | null = null;
      let targetRectIndex = 0;

      for (const range of ranges) {
        const rects = range.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (e.clientX >= r.left - padding && e.clientX <= r.right + padding &&
              e.clientY >= r.top - padding && e.clientY <= r.bottom + padding) {
            isOverWord = true;
            targetRect = r;
            targetRange = range;
            targetRectIndex = i;
            break;
          }
        }
        if (isOverWord) break;
      }

      // Fallback if not strictly over
      if (!targetRect && ranges.length > 0) {
        const rects = ranges[0].getClientRects();
        if (rects.length > 0) {
          targetRect = rects[0];
          targetRange = ranges[0];
          targetRectIndex = 0;
        }
      }

      if (isOverWord && targetRect && targetRange) {
        cancelScheduledHide();
        currentWord = matchedWord;
        currentHighlightedRanges = ranges;

        if (typeof (CSS as any) !== 'undefined' && (CSS as any).highlights) {
          const hl = new (window as any).Highlight(...ranges);
          (CSS as any).highlights.set('rubi-hover-highlight', hl);
        }
        
        const getKanjiRect = (rangesList: Range[], wStart: number, wEnd: number) => {
          if (wStart > wEnd || rangesList.length === 0) {
            return rangesList[0]?.getClientRects()[0];
          }
          try {
            let currentLen = 0;
            let startRect: DOMRect | null = null;
            let endRect: DOMRect | null = null;

            for (const range of rangesList) {
              const treeWalker = document.createTreeWalker(
                range.commonAncestorContainer,
                NodeFilter.SHOW_TEXT,
                {
                  acceptNode: (node) => {
                    return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                  }
                }
              );

              let nodes: Node[] = [];
              if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
                nodes.push(range.commonAncestorContainer);
              } else {
                let node: Node | null;
                while ((node = treeWalker.nextNode())) {
                  nodes.push(node);
                }
              }

              for (const node of nodes) {
                const nodeStartOffset = node === range.startContainer ? range.startOffset : 0;
                const nodeEndOffset = node === range.endContainer ? range.endOffset : node.textContent?.length || 0;
                const nodeLen = nodeEndOffset - nodeStartOffset;

                if (!startRect && currentLen + nodeLen > wStart) {
                  const newRange = document.createRange();
                  newRange.setStart(node, nodeStartOffset + (wStart - currentLen));
                  newRange.setEnd(node, Math.min(nodeStartOffset + (wStart - currentLen) + 1, nodeEndOffset));
                  startRect = newRange.getClientRects()[0];
                }

                if (startRect && currentLen + nodeLen > wEnd) {
                  const newRange = document.createRange();
                  newRange.setStart(node, nodeStartOffset + (wEnd - currentLen));
                  newRange.setEnd(node, Math.min(nodeStartOffset + (wEnd - currentLen) + 1, nodeEndOffset));
                  endRect = newRange.getClientRects()[0];
                  break;
                }

                currentLen += nodeLen;
              }
              if (endRect) break;
            }

            if (startRect && endRect) {
              return {
                left: startRect.left,
                right: endRect.right,
                top: Math.min(startRect.top, endRect.top),
                bottom: Math.max(startRect.bottom, endRect.bottom),
                width: endRect.right - startRect.left,
                height: Math.max(startRect.bottom, endRect.bottom) - Math.min(startRect.top, endRect.top)
              } as DOMRect;
            }
          } catch (e) {
            console.warn('[Rubi] Failed to create kanji sub-range', e);
          }
          return rangesList[0]?.getClientRects()[0];
        };

        const rect = targetRect;
        const translationStr = matchedEntry?.m?.length ? matchedEntry.m.join('; ') : '';
        const displayReading = matchedReading || matchedEntry?.r || '';

        // Create a closure that re-fetches the specific client rect on scroll
        const getRect = () => {
          const currentRects = targetRange!.getClientRects();
          return currentRects.length > targetRectIndex ? currentRects[targetRectIndex] : currentRects[0];
        };

        const wordSnapshot = matchedWord;
        const isRubyMode = currentSettings?.lookupDisplayStyle === 'ruby';

        // Helper for combined word rect
        const getCombinedRect = (rangesList: Range[]) => {
            if (!rangesList || rangesList.length === 0) return targetRange!.getBoundingClientRect();
            const rcts = rangesList.map(r => r.getBoundingClientRect());
            const left = Math.min(...rcts.map(r => r.left));
            const right = Math.max(...rcts.map(r => r.right));
            const top = Math.min(...rcts.map(r => r.top));
            const bottom = Math.max(...rcts.map(r => r.bottom));
            return {
                left, right, top, bottom,
                width: right - left,
                height: bottom - top,
                x: left, y: top
            } as DOMRect;
        };
        const getDynamicWordRect = () => getCombinedRect(currentHighlightedRanges!);
        const lemma = matchedEntry?.lemma || matchedWord;

        // 1. ================= PRONOUNCE BADGE =================
        if (isRubyMode) {
          uiState.pronounceBadge.displayStyle = 'ruby';
          const { chunks } = extractRuby(matchedWord, displayReading, lemma, !!matchedEntry?.isAiFallback);
          const wordRect = getCombinedRect(currentHighlightedRanges!);

          const rubyChunks = chunks.map(c => {
             const cRect = getKanjiRect(currentHighlightedRanges!, c.startIdx, c.endIdx);
             return {
                reading: c.reading,
                centerOffset: cRect ? (cRect.left - wordRect.left + cRect.width / 2) : 0
             };
          });

          if (rubyChunks.length > 0) {
            uiActions.showPronounceBadge(
              '', // No global content
              wordRect,
              false,
              matchedWord,
              '', 
              false,
              getDynamicWordRect,
              rubyChunks
            );
          } else {
            uiActions.hidePronounceBadge();
          }
        } else {
          uiState.pronounceBadge.displayStyle = 'tooltip';
          uiActions.showPronounceBadge(
            displayReading || (matchedEntry?.isAiFallback ? '...' : ''), 
            rect,
            false,
            lemma,
            '', 
            false,
            getRect
          );
        }

        // Helper to update reading dynamically (for AI / background translation)
        const updateDynamicReading = (newReading: string) => {
          if (isRubyMode) {
             const { chunks } = extractRuby(matchedWord, newReading, lemma);
             const wordRect = getDynamicWordRect();
             const newRubyChunks = (chunks || []).map(c => {
                const cRect = getKanjiRect(currentHighlightedRanges!, c.startIdx, c.endIdx);
                return {
                   reading: c.reading,
                   centerOffset: cRect ? (cRect.left - wordRect.left + cRect.width / 2) : 0
                };
             });
             if (newRubyChunks.length > 0) {
                uiActions.updatePronounceBadgeChunks(newRubyChunks);
             }
          } else {
             uiActions.updatePronounceBadgeContent(newReading);
          }
        };
        activeUpdateDynamicReading = updateDynamicReading;

        // 2. ================= TRANSLATION BADGE =================
        const trigger = currentSettings?.translationTrigger || 'hover';
        if (matchedEntry?.isAiFallback) {
          const pos = (currentSettings?.translationPosition === 'pronounce-badge' ? 'bottom' : currentSettings?.translationPosition) || 'bottom';
          const showEngine = currentSettings?.showTranslationEngine ?? true;
          const targetLang = currentSettings?.targetLanguage || 'zh-CN';

          // AI translation only: always fetch to resolve the '...' in pronounce badge
          if (trigger === 'hover') {
            uiActions.showTranslationBadge(
              'AI 翻译中...',
              'AI',
              isRubyMode ? getDynamicWordRect() : (rect as DOMRect),
              false,
              pos,
              showEngine,
              'ai',
              matchedWord
            );
          }

          safeSendMessage({
            type: 'CONTEXTUAL_TRANSLATE',
            word: matchedWord,
            sentence: getSentenceContext(),
            forceReading: true
          }).then((resp: any) => {
            if (currentWord !== wordSnapshot) return;
            
            if (resp?.reading) {
              updateDynamicReading(resp.reading);
            } else if (!resp?.success) {
              updateDynamicReading('错误');
            } else {
              updateDynamicReading(matchedWord); // Fallback to the original word if AI omitted reading
            }

            if (trigger === 'hover') {
              if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return;
              const result = resp?.translation || 'AI 翻译失败';
              const activeRect = isRubyMode ? getDynamicWordRect() : getRect();
              uiActions.showTranslationBadge(
                result,
                'AI',
                activeRect,
                false,
                pos,
                showEngine,
                'ai',
                wordSnapshot
              );
            }
          }).catch((err: any) => {
            if (currentWord !== wordSnapshot) return;
            updateDynamicReading('错误');
            if (trigger === 'hover') {
              if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return;
              const activeRect = isRubyMode ? getDynamicWordRect() : getRect();
              uiActions.showTranslationBadge(
                `AI 翻译出错: ${err.message || err}`,
                'AI',
                activeRect,
                false,
                pos,
                showEngine,
                'ai',
                wordSnapshot
              );
            }
          });
        } else if (trigger === 'hover') {
          const pos = (currentSettings?.translationPosition === 'pronounce-badge' ? 'bottom' : currentSettings?.translationPosition) || 'bottom';
          const showEngine = currentSettings?.showTranslationEngine ?? true;
          const targetLang = currentSettings?.targetLanguage || 'zh-CN';
          const engine = currentSettings?.translationEngine || 'none';

          if (engine === 'none') {
            uiActions.showTranslationBadge(
              `${matchedWord} (${translationStr})`,
              'DICT',
              isRubyMode ? getDynamicWordRect() : (rect as DOMRect),
              false,
              pos,
              showEngine,
              'dict',
              matchedWord
            );
          } else {
            safeSendMessage({
              type: 'FETCH_TRANSLATION',
              text: matchedWord,
              sourceLang: 'ja',
              targetLang,
              engine,
            }).then((resp: any) => {
              if (currentWord !== wordSnapshot) return;
              if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return;
              
              if (resp?.reading && !displayReading && currentSettings?.enableAutoTranslate) {
                updateDynamicReading(resp.reading);
              }

              const result = resp?.targetText || translationStr;
              const activeRect = isRubyMode ? getDynamicWordRect() : getRect();
              uiActions.showTranslationBadge(
                result,
                resp?.targetText ? (resp.engine || engine) : 'DICT',
                activeRect,
                false,
                pos,
                showEngine,
                'machine',
                wordSnapshot,
                resp?.errorInfo
              );
            }).catch(() => {
              if (currentWord !== wordSnapshot) return;
              if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return;
              const activeRect = isRubyMode ? getDynamicWordRect() : getRect();
              uiActions.showTranslationBadge(
                `${matchedWord} (${translationStr})`,
                'DICT',
                activeRect,
                false,
                pos,
                showEngine,
                'dict',
                wordSnapshot
              );
            });
          }
        }
      }
    } else {
      immediateHide();
    }
  } catch (err) {
    console.error('[Rubi] Error in handleMouseMove:', err);
  }
}

// ─── Actions & Triggers ──────────────────────────────────────

export async function triggerTranslation(word: string, targetRange: Range, targetRectIndex: number) {
  const getRect = () => {
    const currentRects = targetRange.getClientRects();
    return currentRects.length > targetRectIndex ? currentRects[targetRectIndex] : currentRects[0];
  };
  const rect = getRect();

  const pos = (currentSettings?.translationPosition === 'pronounce-badge' ? 'bottom' : currentSettings?.translationPosition) || 'bottom';
  const showEngine = currentSettings?.showTranslationEngine ?? true;
  const targetLang = currentSettings?.targetLanguage || 'zh-CN';
  const wordSnapshot = word;

  if (currentWordIsAiFallback) {
    uiActions.showTranslationBadge(
      'AI 翻译中...',
      'AI',
      rect,
      true,
      pos,
      showEngine,
      'ai',
      word
    );
    
    try {
      const response = await safeSendMessage({
        type: 'CONTEXTUAL_TRANSLATE',
        word,
        sentence: getSentenceContext()
      });
      if (currentWord !== wordSnapshot) return;
      if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return;
      
      if (response?.reading) {
        if (activeUpdateDynamicReading) {
          activeUpdateDynamicReading(response.reading);
        } else {
          uiActions.updatePronounceBadgeContent(response.reading);
        }
      }
      
      const result = response?.translation || 'AI 翻译失败';
      uiActions.showTranslationBadge(
        result,
        'AI',
        getRect(),
        true,
        pos,
        showEngine,
        'ai',
        wordSnapshot
      );
    } catch (err: any) {
      if (currentWord !== wordSnapshot) return;
      if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return;
      uiActions.showTranslationBadge(
        `AI 翻译出错: ${err.message || err}`,
        'AI',
        getRect(),
        true,
        pos,
        showEngine,
        'ai',
        wordSnapshot
      );
    }
    return;
  }

  const match = await lookupWord(word);
  if (!match || currentWord !== word) return;

  const matchedEntry = match.entry;
  const translationStr = matchedEntry?.m?.length ? matchedEntry.m.join('; ') : '';

  const engine = currentSettings?.translationEngine || 'none';

  if (engine === 'none') {
    uiActions.showTranslationBadge(
      `${word} (${translationStr})`,
      'DICT',
      rect as DOMRect,
      true,
      pos,
      showEngine,
      'dict',
      word
    );
  } else {
    safeSendMessage({
      type: 'FETCH_TRANSLATION',
      text: word,
      sourceLang: 'ja',
      targetLang,
      engine,
    }).then((resp: any) => {
      if (currentWord !== wordSnapshot) return;
      if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return;
      const result = resp?.targetText || translationStr;
      const activeRect = getRect();
      uiActions.showTranslationBadge(
        result,
        resp?.targetText ? (resp.engine || engine) : 'DICT',
        activeRect,
        true,
        pos,
        showEngine,
        'machine',
        wordSnapshot,
        resp?.errorInfo
      );
    }).catch(() => {
      if (currentWord !== wordSnapshot) return;
      if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return;
      const activeRect = getRect();
      uiActions.showTranslationBadge(
        `${word} (${translationStr})`,
        'DICT',
        activeRect,
        true,
        pos,
        showEngine,
        'dict',
        wordSnapshot
      );
    });
  }
}

export async function triggerTTS(word: string) {
  const settings = await settingsStorage.getValue();
  speakText(word, settings);
}

export async function triggerWordExplain(word: string, clientX: number, clientY: number) {
  uiState.suppressClickUntil = 0;

  if (!currentHighlightedRanges || currentHighlightedRanges.length === 0) return;

  const hlRange = currentHighlightedRanges[0];
  const getRect = () => hlRange.getBoundingClientRect();
  const currentRect = getRect();

  const settings = currentSettings || (await settingsStorage.getValue());
  const pos = (settings.translationPosition === 'pronounce-badge' ? 'bottom' : settings.translationPosition) || 'bottom';
  const showEngine = settings.showTranslationEngine ?? true;

  // Show loading state in the translationBadge, NOT pinned
  uiActions.showTranslationBadge(
    'AI 翻译中...',
    'AI',
    currentRect,
    true,
    pos,
    showEngine,
    'ai',
    word
  );
  uiState.translationBadge.askContext = getSentenceContext();

  try {
    const response = await safeSendMessage({
      type: 'CONTEXTUAL_TRANSLATE',
      word,
      sentence: getSentenceContext()
    });

    if (uiState.translationBadge.originalText !== word) return; // User moved away

    if (response?.success && response.translation) {
      if (response.reading) {
        if (activeUpdateDynamicReading) {
          activeUpdateDynamicReading(response.reading);
        } else {
          uiActions.updatePronounceBadgeContent(response.reading);
        }
      }
      uiActions.showTranslationBadge(
        response.translation,
        'AI',
        getRect(),
        true,
        pos,
        showEngine,
        'ai',
        word
      );
    } else {
      uiActions.showTranslationBadge(
        response?.error ? `翻译失败: ${response.error}` : '翻译失败',
        'AI',
        getRect(),
        true,
        pos,
        showEngine,
        'ai',
        word
      );
    }
  } catch (err: any) {
    if (uiState.translationBadge.originalText !== word) return;
    uiActions.showTranslationBadge(
      `请求出错: ${err.message || err}`,
      'AI',
      getRect(),
      true,
      pos,
      showEngine,
      'ai',
      word
    );
  }
}

export async function triggerMachineTranslation(word: string, clientX: number, clientY: number) {
  uiState.suppressClickUntil = 0;
  if (!word) return;

  if (!currentHighlightedRanges || currentHighlightedRanges.length === 0) return;
  const hlRange = currentHighlightedRanges[0];
  const getRect = () => hlRange.getBoundingClientRect();
  const currentRect = getRect();

  const settings = currentSettings || (await settingsStorage.getValue());
  const pos = (settings.translationPosition === 'pronounce-badge' ? 'bottom' : settings.translationPosition) || 'bottom';
  const showEngine = settings.showTranslationEngine ?? true;
  const engine = settings.translationEngine === 'none' ? 'google' : settings.translationEngine; // Fallback to google if none

  uiState.returnGrace = true;
  uiActions.showTranslationBadge(
    t('翻译中...', settings.uiLanguage), // Using generic translating text
    engine.toUpperCase(),
    currentRect,
    false,
    pos,
    showEngine,
    'machine',
    word
  );

  try {
    const response = await safeSendMessage({
      type: 'FETCH_TRANSLATION',
      text: word,
      sourceLang: 'auto',
      targetLang: settings.targetLanguage,
      engine: engine
    });

    if (uiState.translationBadge.originalText !== word) return;

    if (response?.targetText) {
      uiActions.showTranslationBadge(
        response.targetText,
        response.engine.toUpperCase(),
        getRect(),
        false,
        pos,
        showEngine,
        'machine',
        word
      );
    } else {
      uiActions.showTranslationBadge(
        t('翻译失败', settings.uiLanguage),
        engine.toUpperCase(),
        getRect(),
        false,
        pos,
        showEngine,
        'machine',
        word
      );
    }
  } catch (err: any) {
    if (uiState.translationBadge.originalText !== word) return;
    uiActions.showTranslationBadge(
      t('翻译出错', settings.uiLanguage) + `: ${err.message || err}`,
      engine.toUpperCase(),
      getRect(),
      false,
      pos,
      showEngine,
      'machine',
      word
    );
  }
}


export function getSentenceContext(): string {
  if (currentHighlightedRanges && currentHighlightedRanges.length > 0) {
    const parent = currentHighlightedRanges[0].startContainer.parentElement;
    if (parent) {
      return parent.textContent || '';
    }
  }
  return currentWord || '';
}
