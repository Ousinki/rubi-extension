import { createApp } from 'vue';
import ContentApp from '@/components/content/ContentApp.vue';
import { uiActions, uiState, setLastInteractionY } from '@/utils/content-state';
import { settingsStorage } from '@/utils/storage';
import {
  isEditableElement,
  hasEditableFocus,
  getDeepCaretRangeFromPoint,
  isJapaneseChar
} from '@/utils/dom-ja';
import { safeSendMessage, showErrorToast } from '@/utils/content-messaging';
import { speakText } from '@/utils/tts';
import { loadDictionary, lookupWord, tokenizeJa } from '@/utils/tokenizer';
import { shouldSkipJa } from '@/utils/skip-words-ja';
// Removed Kuromoji imports

import type { RubiSettings } from '@/utils/storage';

let isEnabled = true;
let currentSettings: RubiSettings | null = null;
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
let currentHighlightedRange: Range | null = null;
let currentWord: string | null = null;
let lastMouseX = 0;
let lastMouseY = 0;
let isMouseOverPopup = false;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let ringDelayTimer: ReturnType<typeof setTimeout> | null = null;
let longPressActive = false;
let lastClickTime = 0;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  
  async main(ctx) {
    console.log('[Rubi] Content script main initialized.');
    
    // Inject global host styling for CSS Custom Highlight & Ruby
    injectHostStyles();

    // Load initial settings
    currentSettings = await settingsStorage.getValue();
    isEnabled = currentSettings.enabled;

    // Watch settings changes
    settingsStorage.watch((newSettings) => {
      if (newSettings) {
        currentSettings = newSettings;
        isEnabled = newSettings.enabled;
        if (!isEnabled) {
          clearHoverHighlight();
          uiActions.hidePronounceBadge();
          uiActions.hideTranslationBadge();
        }
      }
    });

    // Setup WXT ShadowRoot UI for Vue floating components
    await setupUi(ctx);

    // Start event listeners
    setupEventListeners();

    // Check dict state and log it
    safeSendMessage({ type: 'GET_DICT_STATE' }).then(res => {
      console.log(`[Rubi] Initial dictionary state: WORDS=${res?.state?.words}, NAMES=${res?.state?.names}, KANJI=${res?.state?.kanji}`);
    });

    setInterval(() => {
      safeSendMessage({ type: 'GET_DICT_STATE' }).then(res => {
        if (res && res.state && (res.state.words === 'updating' || res.state.words === 'init')) {
          console.log('[Rubi] Dictionary is currently downloading in background... Please wait.', res.state);
        }
      });
    }, 5000);

  }
});

// ─── Mounting Shadow UI ──────────────────────────────────────
async function setupUi(ctx: any) {
  if (!document.body) {
    requestAnimationFrame(() => setupUi(ctx));
    return;
  }

  try {
    const ui = await createShadowRootUi(ctx, {
      name: 'rubi-ui-root',
      position: 'inline',
      anchor: () => document.body || document.documentElement,
      append: 'last',
      onMount: (container) => {
        const root = container.getRootNode() as ShadowRoot;
        if (root.host) {
          const host = root.host as HTMLElement;
          // CRITICAL: Ensure the host container is absolutely positioned at (0, 0)
          // and passes through all pointer events so it doesn't block page interactions.
          host.style.pointerEvents = 'none';
          host.style.position = 'absolute';
          host.style.top = '0';
          host.style.left = '0';
          host.style.width = '0';
          host.style.height = '0';
          host.style.zIndex = '2147483647';
          host.style.overflow = 'visible';
          host.classList.add('notranslate');
          host.setAttribute('translate', 'no');
        }
        
        const app = createApp(ContentApp);
        app.mount(container);
        return app;
      },
      onRemove: (app) => {
        app?.unmount();
      },
    });
    ui.mount();
  } catch (e) {
    console.error('[Rubi] Failed to setup ShadowRoot UI:', e);
  }
}

function injectHostStyles() {
  const style = document.createElement('style');
  style.id = 'rubi-host-styles';
  style.textContent = `
    /* CSS Custom Highlight API styling */
    ::highlight(rubi-hover-highlight) {
      background-color: rgba(139, 92, 246, 0.28) !important;
      color: inherit !important;
      text-decoration: underline double #8b5cf6 2px !important;
      text-underline-offset: 3px !important;
    }
    
    #rubi-error-toast {
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* Full-page injected Furigana (Ruby) styling to prevent overlap */
    ruby.rubi-injected-ruby {
      ruby-position: over;
      ruby-align: center;
      line-height: 2.3 !important;
    }
    
    ruby.rubi-injected-ruby rt {
      font-size: 0.52em !important;
      font-weight: 500 !important;
      color: #8b5cf6 !important;
      opacity: 0.82 !important;
      user-select: none !important;
      padding: 0 0.12em !important;
    }
    
    @media (prefers-color-scheme: dark) {
      ruby.rubi-injected-ruby rt {
        color: #a78bfa !important;
      }
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

// ─── Interaction Listeners ──────────────────────────────────
function setupEventListeners() {
  let isThrottled = false;

  document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    if (!isEnabled) return;
    
    const path = e.composedPath ? e.composedPath() : [];
    const isOverShadow = path.some((el: any) =>
      el.id === 'rubi-pronounce-badge' ||
      el.id === 'rubi-translation-badge' ||
      (el.tagName && el.tagName.toLowerCase() === 'rubi-ui-root')
    );

    if (isOverShadow) {
      isMouseOverPopup = true;
      cancelScheduledHide();
      return;
    }

    // Mouse has left the popup area
    if (isMouseOverPopup) {
      isMouseOverPopup = false;
      // Don't hide pinned badges (askMode AI panel open)
      if (uiState.translationBadge.pinned) return;
    }

    if (hasEditableFocus()) return;
    const targetElement = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (isEditableElement(targetElement)) return;

    // ── Synchronous fast-path: check if cursor has left the highlighted word ──
    // This runs even during throttle so the badge disappears immediately.
    if (currentHighlightedRange && currentWord) {
      const hlRects = currentHighlightedRange.getClientRects();
      let stillOverWord = false;
      const padding = 4;
      for (let i = 0; i < hlRects.length; i++) {
        const r = hlRects[i];
        if (e.clientX >= r.left - padding && e.clientX <= r.right + padding &&
            e.clientY >= r.top - padding && e.clientY <= r.bottom + padding) {
          stillOverWord = true;
          break;
        }
      }
      if (!stillOverWord) {
        immediateHide();
        return;
      }
    }

    if (isThrottled) return;
    isThrottled = true;
    setTimeout(() => { isThrottled = false; }, 60);

    handleMouseMove(e);
  });

  document.addEventListener('mousedown', (e) => {
    if (!isEnabled || e.button !== 0) return;

    const path = e.composedPath ? e.composedPath() : [];
    if (path.some((el: any) => el.id === 'rubi-ui-root' || el.id === 'rubi-translation-badge')) {
      return;
    }

    setLastInteractionY(e.clientY);

    if (currentHighlightedRange && currentWord) {
      const textNode = currentHighlightedRange.startContainer;
      const range = getDeepCaretRangeFromPoint(e.clientX, e.clientY);
      if (range && range.startContainer === textNode) {
        const offset = range.startOffset;
        if (offset >= currentHighlightedRange.startOffset && offset < currentHighlightedRange.endOffset) {
          e.preventDefault();
          e.stopPropagation();

          longPressActive = false;

          // Delay showing the ring to avoid flashing on quick clicks (copied from RTTR)
          ringDelayTimer = setTimeout(() => {
            uiActions.showLongPressRing(e.clientX, e.clientY);
          }, 150);

          longPressTimer = setTimeout(() => {
            longPressActive = true;
            uiActions.popLongPressRing();
            triggerWordExplain(currentWord!, e.clientX, e.clientY);
          }, 500);
        }
      }
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (ringDelayTimer) {
      clearTimeout(ringDelayTimer);
      ringDelayTimer = null;
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    uiActions.hideLongPressRing();

    if (currentHighlightedRange && currentWord && !longPressActive) {
      const range = getDeepCaretRangeFromPoint(e.clientX, e.clientY);
      if (range && range.startContainer === currentHighlightedRange.startContainer) {
        const offset = range.startOffset;
        if (offset >= currentHighlightedRange.startOffset && offset < currentHighlightedRange.endOffset) {
          const now = Date.now();
          if (now - lastClickTime > 250) {
            lastClickTime = now;
            triggerTTS(currentWord!);
          }
        }
      }
    }
    longPressActive = false;
  });

  document.addEventListener('click', (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    const isUiClick = path.some((el: any) => el.id === 'rubi-ui-root');
    if (!isUiClick) {
      // Don't hide if clicking on the currently highlighted word itself
      if (currentHighlightedRange) {
        const range = getDeepCaretRangeFromPoint(e.clientX, e.clientY);
        if (range && range.startContainer === currentHighlightedRange.startContainer) {
          const offset = range.startOffset;
          if (offset >= currentHighlightedRange.startOffset && offset < currentHighlightedRange.endOffset) {
            return; // Click is ON the highlighted word — keep tooltip visible
          }
        }
      }
      uiActions.hidePronounceBadge();
      uiActions.hideTranslationBadge();
    }
  });
}

// ─── Word Sourcing & Highlighting ───────────────────────────
async function handleMouseMove(e: MouseEvent) {
  await loadDictionary();

  const range = getDeepCaretRangeFromPoint(e.clientX, e.clientY);
  if (!range) {
    immediateHide();
    return;
  }

  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) {
    immediateHide();
    return;
  }

  const text = textNode.textContent || '';
  const caretOffset = range.startOffset;

  let matchedWord: string | null = null;
  let matchedReading: string = '';
  let matchedEntry: any = null;
  let matchedStart = -1;
  let matchedEnd = -1;

  // ── Dictionary & Morphological Scan (10ten engine) ──────────────────────────────
  // We scan backwards up to 8 characters to find the start of the word.
  // The wordSearch engine handles deinflections automatically (e.g. 食べさせられた -> 食べる)
  await loadDictionary();
  const maxBacktrack = 8;
  const startScan = Math.max(0, caretOffset - maxBacktrack);

  for (let start = caretOffset; start >= startScan; start--) {
    const searchText = text.substring(start, start + 12);
    const match = await lookupWord(searchText);

    if (match && caretOffset >= start && caretOffset < start + match.length) {
      if (!matchedWord) {
        matchedWord = match.word; matchedEntry = match.entry;
        matchedStart = start; matchedEnd = start + match.length;
      } else if (start > matchedStart) {
        // Prefer matches that start later (closer to caret) if they still cover the caret
        matchedWord = match.word; matchedEntry = match.entry;
        matchedStart = start; matchedEnd = start + match.length;
      } else if (start === matchedStart && match.length > (matchedEnd - matchedStart)) {
        // Prefer longer matches starting at the same position
        matchedWord = match.word; matchedEntry = match.entry;
        matchedStart = start; matchedEnd = start + match.length;
      }
    }
  }
  
  if (matchedEntry) {
    matchedReading = matchedEntry.r || '';
  }


  if (matchedWord) {
  }

  if (matchedWord && !shouldSkipJa(matchedWord)) {
    const hlRange = document.createRange();
    hlRange.setStart(textNode, matchedStart);
    hlRange.setEnd(textNode, matchedEnd);

    const rects = hlRange.getClientRects();
    let isOverWord = false;
    const padding = 6;

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (e.clientX >= r.left - padding && e.clientX <= r.right + padding &&
          e.clientY >= r.top - padding && e.clientY <= r.bottom + padding) {
        isOverWord = true;
        break;
      }
    }

    if (isOverWord) {
      cancelScheduledHide();

      if (currentWord === matchedWord && currentHighlightedRange) {
        return;
      }

      currentWord = matchedWord;
      currentHighlightedRange = hlRange;

      if (typeof (CSS as any) !== 'undefined' && (CSS as any).highlights) {
        const hl = new (window as any).Highlight(hlRange);
        (CSS as any).highlights.set('rubi-hover-highlight', hl);
      } else {
        console.warn('[Rubi] CSS.highlights is not supported in this browser!');
      }

      const rect = hlRange.getBoundingClientRect();
      const translationStr = matchedEntry?.m?.length ? matchedEntry.m.join('; ') : '';
      const displayReading = matchedReading || matchedEntry?.r || '';

      // 1. Show Top Pronounce Badge (Japanese Word & Hiragana Reading)
      uiActions.showPronounceBadge(
        displayReading ? displayReading : matchedWord,
        rect as DOMRect,
        false,
        matchedWord,
        '', // pass empty translation here as it goes to translation badge!
        false,
        () => hlRange.getBoundingClientRect()
      );

      const engine = currentSettings?.translationEngine || 'none';
      const pos = currentSettings?.translationPosition || 'bottom';
      const showEngine = currentSettings?.showTranslationEngine ?? true;
      const targetLang = currentSettings?.targetLanguage || 'zh-CN';
      const wordSnapshot = matchedWord;

      if (engine === 'none') {
        // ── Local dictionary only ──────────────────────────────
        uiActions.showTranslationBadge(
          `${matchedWord} (${translationStr})`,
          'DICT',
          rect as DOMRect,
          false,
          pos,
          showEngine,
          false,
          () => hlRange.getBoundingClientRect(),
          matchedWord
        );
      } else {
        // ── API translation only ───────────────────────────────

        safeSendMessage({
          type: 'FETCH_TRANSLATION',
          text: matchedWord,
          sourceLang: 'ja',
          targetLang,
          engine,
        }).then((resp: any) => {
          if (currentWord !== wordSnapshot) return; // User moved away
          if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return; // AI analysis is open
          const result = resp?.targetText || translationStr; // fallback to dict on error
          const activeRect = hlRange.getBoundingClientRect();
          uiActions.showTranslationBadge(
            result,
            resp?.targetText ? (resp.engine || engine) : 'DICT',
            activeRect,
            true,
            pos,
            showEngine,
            false,
            () => hlRange.getBoundingClientRect(),
            wordSnapshot
          );
        }).catch(() => {
          // API failed — fall back to dictionary result silently
          if (currentWord !== wordSnapshot) return;
          if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return; // AI analysis is open
          const activeRect = hlRange.getBoundingClientRect();
          uiActions.showTranslationBadge(
            `${matchedWord} (${translationStr})`,
            'DICT',
            activeRect,
            true,
            pos,
            showEngine,
            false,
            () => hlRange.getBoundingClientRect(),
            wordSnapshot
          );
        });
      }
    } else {
      immediateHide();
    }
  } else {
    immediateHide();
  }
}

function clearHoverHighlight() {
  if (typeof (CSS as any) !== 'undefined' && (CSS as any).highlights) {
    (CSS as any).highlights.delete('rubi-hover-highlight');
  }
  currentHighlightedRange = null;
  currentWord = null;
}

// ─── Actions & Triggers ──────────────────────────────────────
async function triggerTTS(word: string) {
  const settings = await settingsStorage.getValue();
  speakText(word, settings);
}

async function triggerWordExplain(word: string, clientX: number, clientY: number) {
  // Do NOT call hideTranslationBadge() — it sets a 300ms suppress that would block showTranslationBadge.
  // Instead reset state directly.
  uiState.suppressClickUntil = 0;
  uiActions.hidePronounceBadge();

  if (!currentHighlightedRange) return;

  const hlRange = currentHighlightedRange;
  const getRect = () => hlRange.getBoundingClientRect();
  const currentRect = getRect();

  const match = await lookupWord(word);
  const reading = match?.entry?.r || null;
  const wordWithReading = reading ? `${word} ${reading}` : word;

  const settings = currentSettings || (await settingsStorage.getValue());
  const pos = (settings.translationPosition as 'top' | 'bottom') || 'bottom';
  const showEngine = settings.showTranslationEngine ?? true;

  // Show loading state in the same translationBadge using askMode
  uiActions.showTranslationBadge(
    wordWithReading,
    'AI',
    currentRect,
    true,
    pos,
    showEngine,
    false,
    getRect,
    word
  );
  uiState.translationBadge.askMode = true;
  uiState.translationBadge.askLoading = true;
  uiState.translationBadge.askAnswer = '';
  uiState.translationBadge.pinned = true;
  uiState.translationBadge.askContext = getSentenceContext();

  try {
    const response = await safeSendMessage({
      type: 'EXPLAIN_WORD',
      word,
      sentence: getSentenceContext()
    });

    if (uiState.translationBadge.originalText !== word) return; // User moved away

    if (response?.success && response.explanation) {
      uiState.translationBadge.askAnswer = response.explanation;
      uiState.translationBadge.askLoading = false;
    } else {
      uiState.translationBadge.askAnswer = response?.error || 'AI 解析失败，请检查网络连接或 API 配置。';
      uiState.translationBadge.askLoading = false;
    }
  } catch (err: any) {
    if (uiState.translationBadge.originalText !== word) return;
    uiState.translationBadge.askAnswer = `AI 接口请求出错: ${err.message || err}`;
    uiState.translationBadge.askLoading = false;
  }
}

function getSentenceContext(): string {
  if (currentHighlightedRange) {
    const parent = currentHighlightedRange.startContainer.parentElement;
    if (parent) {
      return parent.textContent || '';
    }
  }
  return currentWord || '';
}

// ─── Full-page Furigana (Ruby) Injection ─────────────────────
async function injectRubyAnnotations() {
  const settings = await settingsStorage.getValue();
  if (!settings.enableFuriganaRuby || !settings.enabled) return;

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

async function processNode(node: Text, filterLevel: string) {
  const text = node.textContent || '';
  const segments = tokenizeJa(text);
  const fragment = document.createDocumentFragment();
  let hasRuby = false;

  for (const segment of segments) {
    if (segment.isWordLike && /[\u4e00-\u9fff]/.test(segment.text)) {
      const match = await lookupWord(segment.text);
      if (match && match.entry.r) {
        const wordJlpt = match.entry.j || 'N5';
        if (shouldAnnotateJlpt(wordJlpt, filterLevel)) {
          const ruby = document.createElement('ruby');
          ruby.className = 'rubi-injected-ruby';
          ruby.appendChild(document.createTextNode(segment.text));
          const rt = document.createElement('rt');
          rt.textContent = match.entry.r;
          ruby.appendChild(rt);
          fragment.appendChild(ruby);
          hasRuby = true;
          continue;
        }
      }
    }
    fragment.appendChild(document.createTextNode(segment.text));
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

// ─── Hide Timers ────────────────────────────────────────────
function immediateHide() {
  if (isMouseOverPopup) return; // Don't hide if mouse is still over the popup
  if (uiState.translationBadge.pinned) return; // Don't hide pinned (AI mode) badge
  cancelScheduledHide();
  clearHoverHighlight();
  if (!uiState.pronounceBadge.pinned) uiActions.hidePronounceBadge();
  if (!uiState.translationBadge.pinned) uiActions.hideTranslationBadge();
}

function scheduleHide() {
  if (hoverTimer) return;
  hoverTimer = setTimeout(() => {
    if (!isMouseOverPopup) {
      clearHoverHighlight();
      uiActions.hidePronounceBadge();
      uiActions.hideTranslationBadge();
    }
    hoverTimer = null;
  }, 300);
}

function cancelScheduledHide() {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
}

function scheduleHidePopup() {
  isMouseOverPopup = false;
  scheduleHide();
}
