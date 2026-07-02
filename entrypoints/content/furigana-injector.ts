/**
 * Rubi Furigana Injector
 *
 * Handles full-page Ruby (振り仮名) annotation injection and removal.
 * Uses TreeWalker to traverse text nodes, lookupWord() for readings,
 * and creates <ruby>/<rt> elements in-place.
 */

import { settingsStorage } from '@/utils/storage';
import { loadDictionary, lookupWord, tokenizeJa } from '@/utils/tokenizer';

// ─── Local Furigana Toggle State ───────────────────────────────
let localFuriganaState = false;

export function getLocalFuriganaState(): boolean {
  return localFuriganaState;
}

export function setLocalFuriganaState(val: boolean): void {
  localFuriganaState = val;
}

export function getEffectiveFuriganaState(): boolean {
  return localFuriganaState;
}

// ─── Public API ───────────────────────────────────────────────

export function removeRubyAnnotations(): void {
  const rubies = document.querySelectorAll('ruby.rubi-injected-ruby');
  rubies.forEach(ruby => {
    const textNode = document.createTextNode(ruby.firstChild?.textContent || '');
    ruby.parentNode?.replaceChild(textNode, ruby);
  });
}

export async function injectRubyAnnotations(): Promise<void> {
  const settings = await settingsStorage.getValue();
  if (!getEffectiveFuriganaState() || !settings.enabled) return;

  await loadDictionary();

  const nodesToProcess: Text[] = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (
          tag === 'script' ||
          tag === 'style' ||
          tag === 'noscript' ||
          tag === 'textarea' ||
          tag === 'input' ||
          tag === 'code' ||
          tag === 'pre' ||
          parent.isContentEditable ||
          parent.closest('rubi-ui-root')
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return /[\u4e00-\u9fff]/.test(node.textContent || '')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      }
    }
  );

  let node;
  while ((node = walker.nextNode() as Text | null)) {
    nodesToProcess.push(node);
  }

  const BATCH_SIZE = 40;
  async function processBatch(startIndex: number) {
    const endIndex = Math.min(startIndex + BATCH_SIZE, nodesToProcess.length);
    for (let i = startIndex; i < endIndex; i++) {
      await processNode(nodesToProcess[i], settings.jlptFilterLevel);
    }
    if (endIndex < nodesToProcess.length) {
      setTimeout(() => processBatch(endIndex), 20);
    }
  }

  if (nodesToProcess.length > 0) {
    processBatch(0);
  }
}

// ─── Internal Helpers ─────────────────────────────────────────

async function processNode(node: Text, filterLevel: string): Promise<void> {
  const text = node.textContent || '';
  if (!/[\u4e00-\u9fff]/.test(text)) return;

  const segments = tokenizeJa(text);
  const fragment = document.createDocumentFragment();
  let hasRuby = false;
  let currentIndex = 0;
  let segmentIndex = 0;

  while (currentIndex < text.length) {
    while (segmentIndex < segments.length && segments[segmentIndex].index + segments[segmentIndex].text.length <= currentIndex) {
      segmentIndex++;
    }

    if (segmentIndex >= segments.length) {
      fragment.appendChild(document.createTextNode(text.substring(currentIndex)));
      break;
    }

    const segment = segments[segmentIndex];
    const remainingSegmentText = segment.text.substring(currentIndex - segment.index);

    if (segment.isWordLike && /[\u4e00-\u9fff]/.test(remainingSegmentText)) {
      const remainingText = text.substring(currentIndex);
      const match = await lookupWord(remainingText);

      let finalMatch = null;
      if (match && match.entry.r && match.length > 0) {
        const matchEndIndex = currentIndex + match.length;

        // Check if matchEndIndex aligns with ANY segment's end boundary
        const alignsWithBoundary = segments.some(s => s.index + s.text.length === matchEndIndex);

        if (alignsWithBoundary) {
          finalMatch = match;
        } else {
          // Dictionary match broke a segment boundary (e.g. FMM greedy error like "日本国" breaking "国内").
          // Fallback to searching ONLY within the current segment to prevent bleeding across words.
          const fallbackMatch = await lookupWord(remainingSegmentText);
          if (fallbackMatch && fallbackMatch.entry.r && fallbackMatch.length > 0) {
            finalMatch = fallbackMatch;
          }
        }
      }

      if (finalMatch) {
        const matchedStr = text.substring(currentIndex, currentIndex + finalMatch.length);
        const wordJlpt = finalMatch.entry.j || 'N5';

        if (shouldAnnotateJlpt(wordJlpt, filterLevel)) {
          const ruby = document.createElement('ruby');
          ruby.className = 'rubi-injected-ruby';
          ruby.appendChild(document.createTextNode(matchedStr));
          const rt = document.createElement('rt');
          rt.textContent = finalMatch.entry.r;
          ruby.appendChild(rt);
          fragment.appendChild(ruby);
          hasRuby = true;
        } else {
          fragment.appendChild(document.createTextNode(matchedStr));
        }

        currentIndex += finalMatch.length;
        continue;
      }
    }

    // No match or no kanji in the rest of the segment
    if (!/[\u4e00-\u9fff]/.test(remainingSegmentText)) {
      fragment.appendChild(document.createTextNode(remainingSegmentText));
      currentIndex += remainingSegmentText.length;
    } else {
      fragment.appendChild(document.createTextNode(text[currentIndex]));
      currentIndex++;
    }
  }

  if (hasRuby && node.parentNode) {
    node.parentNode.replaceChild(fragment, node);
  }
}

function shouldAnnotateJlpt(wordLevel: string, filterLevel: string): boolean {
  if (filterLevel === 'all') return true;

  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const wordIdx = levels.indexOf(wordLevel);
  const filterIdx = levels.indexOf(filterLevel);

  if (wordIdx === -1) return true;
  return wordIdx >= filterIdx;
}
