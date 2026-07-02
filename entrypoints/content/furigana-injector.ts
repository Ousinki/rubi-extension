/**
 * Rubi Furigana Injector
 *
 * Handles full-page Ruby (振り仮名) annotation injection and removal.
 * Uses Kuromoji morphological analysis for accurate, token-level readings.
 *
 * Architecture: For each text node that contains kanji, we call KUROMOJI_PARSE
 * once to get all tokens. Each token with kanji gets a <ruby> annotation using
 * the token's actual reading (not the dictionary/lemma form). Trailing okurigana
 * (hiragana after kanji in the surface form) is rendered as plain text.
 *
 * e.g.  "説明している" →
 *   Token[説明, セツメイ] → <ruby>説明<rt>せつめい</rt></ruby>
 *   Token[し]             → し   (plain, no kanji)
 *   Token[て]             → て
 *   Token[い]             → い
 *   Token[ます]           → ます
 *
 * e.g.  "食べる" →
 *   Token[食べる, タベル] → <ruby>食<rt>た</rt></ruby>べる
 */

import { safeSendMessage } from '@/utils/content-messaging';
import { settingsStorage } from '@/utils/storage';

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
    // Restore all text content from the ruby element (base + rt text won't be included
    // since we only grab text nodes)
    const baseText = ruby.firstChild?.textContent || '';
    // Also grab any okurigana that was appended as a sibling (stored in data attribute)
    const textNode = document.createTextNode(baseText);
    ruby.parentNode?.replaceChild(textNode, ruby);
  });
}

export async function injectRubyAnnotations(): Promise<void> {
  const settings = await settingsStorage.getValue();
  if (!getEffectiveFuriganaState() || !settings.enabled) return;

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
          tag === 'ruby' ||
          tag === 'rt' ||
          tag === 'rp' ||
          parent.isContentEditable ||
          parent.closest('rubi-ui-root') ||
          parent.closest('ruby')
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

  const BATCH_SIZE = 20;
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

// ─── Internal: Kuromoji-based annotation ──────────────────────

async function processNode(node: Text, filterLevel: string): Promise<void> {
  const text = node.textContent || '';
  if (!text || !/[\u4e00-\u9fff]/.test(text)) return;

  // Ask the background worker to run Kuromoji tokenization
  let tokens: KuromojiToken[] | null = null;
  try {
    const resp = await safeSendMessage({ type: 'KUROMOJI_PARSE', text });
    if (resp && resp.success && Array.isArray(resp.result)) {
      tokens = resp.result as KuromojiToken[];
    }
  } catch (e) {
    // If Kuromoji is unavailable, skip this node silently
    return;
  }

  if (!tokens || tokens.length === 0) return;

  const fragment = document.createDocumentFragment();
  let hasRuby = false;

  for (const token of tokens) {
    const surface = token.surface_form;

    // Only annotate tokens that contain kanji AND have a reading
    if (/[\u4e00-\u9fff]/.test(surface) && token.reading && token.reading !== '*') {
      // Convert katakana reading → hiragana
      const fullReading = katakanaToHiragana(token.reading);

      // Split surface into: kana_prefix + kanji_core + kana_suffix
      // e.g. "ご覧"   → prefix="ご",  core="覧",  suffix=""   → ご + <ruby>覧<rt>らん</rt></ruby>
      // e.g. "食べる" → prefix="",    core="食",  suffix="べる" → <ruby>食<rt>た</rt></ruby>べる
      // e.g. "説明"   → prefix="",    core="説明", suffix=""   → <ruby>説明<rt>せつめい</rt></ruby>
      const leadingKana = surface.match(/^[\u3040-\u30ff\uff65-\uff9f]*/)?.[0] || '';
      const afterLeading = surface.slice(leadingKana.length);
      const trailingKana = afterLeading.match(/[\u3040-\u30ff\uff65-\uff9f]*$/)?.[0] || '';
      const kanjiCore = afterLeading.slice(0, afterLeading.length - trailingKana.length);

      // Trim the corresponding kana from start/end of the reading
      let reading = fullReading;
      const leadingKanaHira = katakanaToHiragana(leadingKana);
      const trailingKanaHira = katakanaToHiragana(trailingKana);
      if (leadingKana && reading.startsWith(leadingKanaHira)) {
        reading = reading.slice(leadingKanaHira.length);
      }
      if (trailingKana && reading.endsWith(trailingKanaHira) && reading.length > trailingKanaHira.length) {
        reading = reading.slice(0, reading.length - trailingKanaHira.length);
      }

      // Output: [prefix plain text] + [ruby for kanji core] + [suffix plain text]
      if (leadingKana) {
        fragment.appendChild(document.createTextNode(leadingKana));
      }

      if (kanjiCore && reading) {
        const ruby = document.createElement('ruby');
        ruby.className = 'rubi-injected-ruby';
        ruby.appendChild(document.createTextNode(kanjiCore));
        const rt = document.createElement('rt');
        rt.textContent = reading;
        ruby.appendChild(rt);
        fragment.appendChild(ruby);
        hasRuby = true;
      } else if (kanjiCore) {
        fragment.appendChild(document.createTextNode(kanjiCore));
      }

      if (trailingKana) {
        fragment.appendChild(document.createTextNode(trailingKana));
      }
    } else {
      // Non-kanji token (hiragana, katakana, punctuation, etc.) → plain text
      fragment.appendChild(document.createTextNode(surface));
    }
  }

  if (hasRuby && node.parentNode) {
    node.parentNode.replaceChild(fragment, node);
  }
}

// ─── Helpers ──────────────────────────────────────────────────

interface KuromojiToken {
  surface_form: string;
  reading?: string;
  pos?: string;
  basic_form?: string;
}

/** Convert full-width katakana to hiragana */
function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

function shouldAnnotateJlpt(wordLevel: string, filterLevel: string): boolean {
  if (filterLevel === 'all') return true;
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const wordIdx = levels.indexOf(wordLevel);
  const filterIdx = levels.indexOf(filterLevel);
  if (wordIdx === -1) return true;
  return wordIdx >= filterIdx;
}
