import { createApp } from 'vue';
import ContentApp from '@/components/content/ContentApp.vue';
import { uiActions, uiState, setLastInteractionY } from '@/utils/content-state';
import { settingsStorage } from '@/utils/storage';
import {
  isEditableElement,
  hasEditableFocus,
  getDeepElementFromPoint
} from '@/utils/dom-ja';
import { getTextAtPoint } from '@/utils/10ten/get-text';
import { safeSendMessage, showErrorToast } from '@/utils/content-messaging';
import { speakText } from '@/utils/tts';
import { loadDictionary, lookupWord, tokenizeJa } from '@/utils/tokenizer';
import { shouldSkipJa } from '@/utils/skip-words-ja';
import { t } from '@/utils/i18n';
// Removed Kuromoji imports

import type { RubiSettings } from '@/utils/storage';

let isEnabled = true;
let currentSettings: RubiSettings | null = null;
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
let currentHighlightedRanges: Range[] | null = null;
let currentWord: string | null = null;
let currentWordIsAiFallback = false;
let lastClickTime = 0;

let localFuriganaState: boolean = false;
function getEffectiveFuriganaState(): boolean {
  return localFuriganaState;
}

let lastMouseX = 0;
let lastMouseY = 0;
let isMouseOverPopup = false;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let ringDelayTimer: ReturnType<typeof setTimeout> | null = null;
let longPressActive = false;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  
  async main(ctx) {
    console.log('[Rubi] Content script main initialized.');
    // Load initial settings
    currentSettings = await settingsStorage.getValue();
    isEnabled = currentSettings.enabled;

    // Inject global host styling for CSS Custom Highlight & Ruby
    injectHostStyles(currentSettings);

    // Watch settings changes
    settingsStorage.watch((newSettings, oldSettings) => {
      if (newSettings) {
        currentSettings = newSettings;
        injectHostStyles(currentSettings);
        
        // Re-inject translation badge if it's pinned to apply new colors immediately
        
        isEnabled = newSettings.enabled;
        if (!isEnabled) {
          clearHoverHighlight();
          uiActions.hidePronounceBadge();
          uiActions.hideTranslationBadge();
          localFuriganaState = false;
          removeRubyAnnotations();
        }

        // Handle furigana settings changes
        if (oldSettings) {
          if (newSettings.enableFuriganaRuby !== oldSettings.enableFuriganaRuby) {
            if (!newSettings.enableFuriganaRuby) {
              localFuriganaState = false; // Master switch turned off, force remove
              removeRubyAnnotations();
            }
          } else if (getEffectiveFuriganaState() && newSettings.jlptFilterLevel !== oldSettings.jlptFilterLevel) {
            removeRubyAnnotations();
            injectRubyAnnotations();
          }
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

const HIGHLIGHT_THEMES: Record<string, { main: string, dark: string, bg: string }> = {
  purple: { main: '#8b5cf6', dark: '#a78bfa', bg: 'rgba(139, 92, 246, 0.28)' },
  pink: { main: '#FF758F', dark: '#FFB3C1', bg: 'rgba(255, 117, 143, 0.28)' },
  yellow: { main: '#eab308', dark: '#fde047', bg: 'rgba(234, 179, 8, 0.28)' },
  blue: { main: '#3b82f6', dark: '#60a5fa', bg: 'rgba(59, 130, 246, 0.28)' },
};

function injectHostStyles(settings: any = {}) {
  let style = document.getElementById('rubi-host-styles') as HTMLStyleElement;
  if (!style) {
    style = document.createElement('style');
    style.id = 'rubi-host-styles';
    (document.head || document.documentElement).appendChild(style);
  }

  const styleKey = settings.highlightStyle || 'purple';
  const furiganaColor = settings.furiganaColor || 'theme';
  const furiganaFont = settings.furiganaFont || 'system';
  const furiganaOpacity = settings.furiganaOpacity || '0.8';

  const theme = HIGHLIGHT_THEMES[styleKey as keyof typeof HIGHLIGHT_THEMES] || HIGHLIGHT_THEMES.purple;

  let rtColor = `${theme.main} !important`;
  let rtDarkColor = `${theme.dark} !important`;
  
  if (furiganaColor === 'gray') {
    rtColor = '#6b7280 !important';
    rtDarkColor = '#9ca3af !important';
  } else if (furiganaColor === 'text') {
    rtColor = 'inherit !important';
    rtDarkColor = 'inherit !important';
  }

  let fontStyle = '';
  if (furiganaFont === 'sans-serif') {
    fontStyle = 'font-family: sans-serif !important;';
  } else if (furiganaFont === 'serif') {
    fontStyle = 'font-family: serif !important;';
  } else if (furiganaFont === 'monospace') {
    fontStyle = 'font-family: monospace !important;';
  } else {
    fontStyle = 'font-family: system-ui, -apple-system, sans-serif !important;';
  }

  style.textContent = `
    rubi-ui-root {
      --rubi-highlight-main: ${theme.main};
      --rubi-highlight-dark: ${theme.dark};
    }

    /* CSS Custom Highlight API styling */
    ::highlight(rubi-hover-highlight) {
      background-color: ${theme.bg} !important;
      color: inherit !important;
      text-decoration: underline double ${theme.main} 2px !important;
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
      color: ${rtColor};
      opacity: ${furiganaOpacity} !important;
      user-select: none !important;
      padding: 0 0.12em !important;
      ${fontStyle}
    }
    
    @media (prefers-color-scheme: dark) {
      ruby.rubi-injected-ruby rt {
        color: ${rtDarkColor};
      }
    }

    .rubi-paragraph-loading {
      color: #999 !important;
      transition: color 0.3s ease;
    }
    .rubi-paragraph-loading > :not(.rubi-inline-spinner) {
      opacity: 0.5 !important;
      transition: opacity 0.3s ease;
    }
    .rubi-inline-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(150, 150, 150, 0.3);
      border-top-color: #888;
      border-radius: 50%;
      animation: rubi-spin 0.8s linear infinite;
      margin-left: 8px;
      vertical-align: middle;
    }
    @keyframes rubi-spin {
      to { transform: rotate(360deg); }
    }

    font.rubi-paragraph-translation {
      display: inline;
      margin: 0;
      padding: 0;
      background: transparent;
      white-space: pre-wrap;
    }
    font.rubi-paragraph-translation-inner {
      opacity: 0.65;
      animation: rubi-para-fade-in 0.3s ease forwards;
    }
    font.rubi-paragraph-translation-inner.rubi-loading {
      animation: rubi-para-fade-in 0.3s ease forwards, rubi-para-pulse 1.5s ease-in-out infinite;
    }
    font.rubi-paragraph-translation.rubi-para-trans-exit {
      animation: rubi-para-fade-out 0.2s ease forwards;
    }
    @keyframes rubi-para-fade-in {
      from { opacity: 0; }
      to { opacity: 0.65; }
    }
    @keyframes rubi-para-fade-out {
      from { opacity: 0.65; }
      to { opacity: 0; }
    }
    @keyframes rubi-para-pulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.65; }
    }
  `;
}

// ─── Paragraph Translation Helpers ───────────────────────────
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'TD', 'TH', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'ARTICLE', 'SECTION', 'PRE'
]);

function findParagraph(el: HTMLElement | null): HTMLElement | null {
  while (el && el.tagName !== 'BODY' && el.tagName !== 'MAIN') {
    if (el.classList?.contains('rubi-paragraph-translation')) {
      const orig = (el as any)._rubi_original_paragraph;
      if (orig) return orig;
      const prev = el.previousElementSibling as HTMLElement;
      if (prev) return prev;
      return null;
    }
    if (el.classList && BLOCK_TAGS.has(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
}

function setParagraphLoading(paragraph: HTMLElement, isLoading: boolean) {
  paragraph.querySelectorAll(':scope > .rubi-inline-spinner').forEach((el) => el.remove());
  if (isLoading) {
    paragraph.classList.add('rubi-paragraph-loading');
    const spinner = document.createElement('span');
    spinner.className = 'rubi-inline-spinner';
    paragraph.appendChild(spinner);
  } else {
    paragraph.classList.remove('rubi-paragraph-loading');
  }
}

async function handleInlineParagraphTranslate(paragraph: HTMLElement) {
  if ((paragraph as any)._rubi_original_paragraph) {
    paragraph = (paragraph as any)._rubi_original_paragraph;
  } else if (paragraph.classList.contains('rubi-paragraph-translation')) {
    const prev = paragraph.previousElementSibling;
    if (prev && !prev.classList.contains('rubi-paragraph-translation')) {
      paragraph = prev as HTMLElement;
    } else {
      paragraph.remove();
      return;
    }
  }
  const existing = (paragraph as any)._rubi_translation_block;
  if (existing && document.body.contains(existing)) {
    existing.classList.add('rubi-para-trans-exit');
    existing.addEventListener('animationend', () => existing.remove(), { once: true });
    setTimeout(() => { if (existing.parentNode) existing.remove(); }, 500);
    (paragraph as any)._rubi_translation_block = null;
    return;
  }

  const nested = paragraph.querySelector(':scope > .rubi-paragraph-translation');
  if (nested) {
    nested.classList.add('rubi-para-trans-exit');
    nested.addEventListener('animationend', () => nested.remove(), { once: true });
    setTimeout(() => { if (nested.parentNode) nested.remove(); }, 500);
    (paragraph as any)._rubi_translation_block = null;
    return;
  }

  let sibling = paragraph.nextElementSibling;
  let removedSibling = false;
  while (sibling && sibling.classList.contains('rubi-paragraph-translation')) {
    const toRemove = sibling;
    toRemove.classList.add('rubi-para-trans-exit');
    toRemove.addEventListener('animationend', () => toRemove.remove(), { once: true });
    setTimeout(() => { if (toRemove.parentNode) toRemove.remove(); }, 500);
    removedSibling = true;
    sibling = sibling.nextElementSibling;
  }
  if (removedSibling) {
    (paragraph as any)._rubi_translation_block = null;
    return;
  }

  const fullText = (paragraph.textContent || '').trim();
  if (!fullText) return;

  const isHeading = /^H[1-6]$/.test(paragraph.tagName);
  await handleBlockTranslate(paragraph, isHeading);
}

async function handleBlockTranslate(paragraph: HTMLElement, isHeading: boolean) {
  let textToTranslate = paragraph.innerText || paragraph.textContent || '';
  textToTranslate = textToTranslate.replace(/◯/g, ' ').trim();
  if (!textToTranslate) return;

  const transWrapper = document.createElement('font');
  transWrapper.className = 'rubi-paragraph-translation notranslate';
  transWrapper.setAttribute('translate', 'no');
  
  const spacer = document.createElement('font');
  const isShortHeading = isHeading && paragraph.textContent && paragraph.textContent.trim().length < 20;
  spacer.innerHTML = isShortHeading ? '&nbsp;&nbsp;' : '<br>';
  
  const transInner = document.createElement('font');
  transInner.className = 'rubi-paragraph-translation-inner rubi-loading';
  transInner.innerHTML = t('AI 翻译中...', currentSettings?.uiLanguage);
  
  transWrapper.appendChild(spacer);
  transWrapper.appendChild(transInner);

  (paragraph as any)._rubi_original_paragraph = paragraph;
  (paragraph as any)._rubi_translation_block = transWrapper;
  (transWrapper as any)._rubi_original_paragraph = paragraph;
  
  paragraph.appendChild(transWrapper);

  try {
    const engine = currentSettings?.translationEngine || 'google';
    if (engine !== 'none') {
      const resp = await safeSendMessage({
        type: 'FETCH_TRANSLATION',
        text: textToTranslate,
        sourceLang: 'auto',
        targetLang: currentSettings?.targetLanguage || 'zh-CN',
        engine
      });
      if (resp?.targetText) {
        transInner.textContent = resp.targetText;
        transInner.classList.remove('rubi-loading');
        return;
      }
    }
    const aiResp = await safeSendMessage({
      type: 'CONTEXTUAL_TRANSLATE',
      word: textToTranslate,
      sentence: textToTranslate
    });
    if (aiResp?.success && aiResp.translation) {
      transInner.textContent = aiResp.translation;
    } else {
      transInner.textContent = aiResp?.error ? `${t('翻译失败', currentSettings?.uiLanguage)}: ${aiResp.error}` : t('翻译失败', currentSettings?.uiLanguage);
    }
  } catch (err: any) {
    transInner.textContent = t('翻译出错', currentSettings?.uiLanguage) + `: ${err?.message || err}`;
  } finally {
    transInner.classList.remove('rubi-loading');
  }
}

// ─── Interaction Listeners ──────────────────────────────────
function setupEventListeners() {
  let isThrottled = false;
  let lastMouseTarget: HTMLElement | null = null;
  let inlineLongPressTimer: ReturnType<typeof setTimeout> | null = null;
  let lastDirectTranslatedParagraph: HTMLElement | null = null;

  document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    lastMouseTarget = e.target as HTMLElement;

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
    if (currentHighlightedRanges && currentWord) {
      const hlRects = currentHighlightedRanges[0].getClientRects(); // Use first range for fast check
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
        scheduleHide();
        return;
      } else {
        cancelScheduledHide();
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
    if (path.some((el: any) => 
      (el.tagName && el.tagName.toLowerCase() === 'rubi-ui-root') ||
      el.id === 'rubi-translation-badge' ||
      el.id === 'rubi-pronounce-badge'
    )) {
      return;
    }

    setLastInteractionY(e.clientY);

    if (currentHighlightedRanges && currentWord) {
      // Check if mouse is still inside any of the highlighted ranges
      let isInside = false;
      for (const hlRange of currentHighlightedRanges) {
        const rects = hlRange.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (e.clientX >= r.left && e.clientX <= r.right &&
              e.clientY >= r.top && e.clientY <= r.bottom) {
            isInside = true;
            break;
          }
        }
        if (isInside) break;
      }
      if (isInside) {
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
  });

  document.addEventListener('mouseup', (e) => {
    if (!isEnabled) return;
    if (ringDelayTimer) {
      clearTimeout(ringDelayTimer);
      ringDelayTimer = null;
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    uiActions.hideLongPressRing();

    if (currentHighlightedRanges && currentWord && !longPressActive) {
      let isInside = false;
      let matchedRange: Range | null = null;
      let rangeIndex = 0;
      for (const hlRange of currentHighlightedRanges) {
        const rects = hlRange.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (e.clientX >= r.left && e.clientX <= r.right &&
              e.clientY >= r.top && e.clientY <= r.bottom) {
            isInside = true;
            matchedRange = hlRange;
            rangeIndex = i;
            break;
          }
        }
        if (isInside) break;
      }
      if (isInside && matchedRange) {
        const now = Date.now();
        if (now - lastClickTime > 250) {
          lastClickTime = now;
          triggerTTS(currentWord!);
        }

        const trigger = currentSettings?.translationTrigger || 'hover';
        if (trigger === 'click') {
          triggerTranslation(currentWord!, matchedRange, rangeIndex);
        }
      }
    }
    longPressActive = false;
  });

  document.addEventListener('click', (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    const isUiClick = path.some((el: any) => 
      (el.tagName && el.tagName.toLowerCase() === 'rubi-ui-root') ||
      el.id === 'rubi-translation-badge' ||
      el.id === 'rubi-pronounce-badge'
    );
    if (!isUiClick) {
      // Don't hide if clicking on the currently highlighted word itself
      if (currentHighlightedRanges) {
        let isInside = false;
        for (const hlRange of currentHighlightedRanges) {
          const rects = hlRange.getClientRects();
          for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            if (e.clientX >= r.left && e.clientX <= r.right &&
                e.clientY >= r.top && e.clientY <= r.bottom) {
              isInside = true;
              break;
            }
          }
          if (isInside) break;
        }
        if (isInside) return; // Click is ON the highlighted word — keep tooltip visible
      }
      uiActions.hidePronounceBadge();
      uiActions.hideTranslationBadge();
    }
  });

  document.addEventListener('dblclick', (e) => {
    if (!isEnabled || e.button !== 0) return;

    if (currentHighlightedRanges && currentWord) {
      let isInside = false;
      let matchedRange: Range | null = null;
      let rangeIndex = 0;
      for (const hlRange of currentHighlightedRanges) {
        const rects = hlRange.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (e.clientX >= r.left && e.clientX <= r.right &&
              e.clientY >= r.top && e.clientY <= r.bottom) {
            isInside = true;
            matchedRange = hlRange;
            rangeIndex = i;
            break;
          }
        }
        if (isInside) break;
      }
      if (isInside && matchedRange) {
        const trigger = currentSettings?.translationTrigger || 'hover';
        if (trigger === 'dblclick') {
          e.preventDefault();
          e.stopPropagation();
          triggerTranslation(currentWord!, matchedRange, rangeIndex);
        }
      }
    }
  });

  document.addEventListener('keydown', async (e) => {
    if (!isEnabled) return;
    
    // Ignore if typing in an input, textarea, or contenteditable
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl) {
      const tag = activeEl.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || activeEl.isContentEditable) {
        return;
      }
    }

    // Inline paragraph translation — keyboard trigger modes
    if (currentSettings?.inlineParagraphTrigger && currentSettings?.inlineParagraphTrigger !== 'none' && !e.repeat) {
      const trigger = currentSettings.inlineParagraphTrigger || 'shift';
      let matched = false;

      if (trigger === 'shift' && e.key === 'Shift' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        matched = true;
      } else if (trigger === 'ctrl' && e.key === 'Control' && !e.shiftKey && !e.metaKey && !e.altKey) {
        matched = true;
      } else if (trigger === 'alt' && e.key === 'Alt' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        matched = true;
      } else if (trigger === 'custom') {
        const shortcut = currentSettings.inlineParagraphCustomShortcut || '';
        if (shortcut) {
          const parts = shortcut.split('+');
          const keyPart = parts[parts.length - 1]; // e.g. 'KeyP'
          const needCtrl = parts.includes('Ctrl');
          const needAlt = parts.includes('Alt');
          const needShift = parts.includes('Shift');
          if (e.code === keyPart
            && (needCtrl ? (e.ctrlKey || e.metaKey) : true)
            && (needAlt ? e.altKey : true)
            && (needShift ? e.shiftKey : true)) {
            matched = true;
          }
        }
      }

      if (matched) {
        const transBlockUnder = lastMouseTarget?.closest?.('.rubi-paragraph-translation') as HTMLElement | null;
        if (transBlockUnder) {
          e.preventDefault();
          transBlockUnder.classList.add('rubi-para-trans-exit');
          transBlockUnder.addEventListener('animationend', () => transBlockUnder.remove(), { once: true });
          setTimeout(() => { if (transBlockUnder.parentNode) transBlockUnder.remove(); }, 500);
          return;
        }
        const paragraph = findParagraph(lastMouseTarget);
        if (paragraph) {
          e.preventDefault();
          handleInlineParagraphTranslate(paragraph);
          return;
        }
      }
    }

    const settings = await settingsStorage.getValue();
    const shortcut = settings.furiganaShortcut || 'Alt+KeyF';
    if (!shortcut) return;

    const parts = shortcut.split('+');
    const targetCode = parts[parts.length - 1];
    const needsAlt = parts.includes('Alt');
    const needsCtrl = parts.includes('Ctrl');
    const needsShift = parts.includes('Shift');
    const needsMeta = parts.includes('Meta');

    if (e.code === targetCode && 
        e.altKey === needsAlt && 
        e.ctrlKey === needsCtrl && 
        e.shiftKey === needsShift && 
        e.metaKey === needsMeta) {
      e.preventDefault();
      
      // If the master switch is disabled in settings, do nothing
      if (!currentSettings?.enableFuriganaRuby) return;

      localFuriganaState = !localFuriganaState;
      if (localFuriganaState) {
        injectRubyAnnotations();
      } else {
        removeRubyAnnotations();
      }
    }
  });

  // Inline paragraph translation — longpress mode
  document.addEventListener('pointerdown', (e) => {
    if (!currentSettings?.enabled || !currentSettings?.inlineParagraphTrigger || currentSettings.inlineParagraphTrigger === 'none') return;
    if (currentSettings.inlineParagraphTrigger !== 'longpress') return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('rubi-ui-root') || target.closest('.rubi-paragraph-translation')) return;
    const paragraph = findParagraph(target);
    if (!paragraph) return;
    inlineLongPressTimer = setTimeout(() => {
      handleInlineParagraphTranslate(paragraph);
      inlineLongPressTimer = null;
    }, 500);
  }, { capture: true });

  document.addEventListener('pointerup', () => {
    if (inlineLongPressTimer) { clearTimeout(inlineLongPressTimer); inlineLongPressTimer = null; }
  }, { capture: true });

  document.addEventListener('pointermove', () => {
    if (inlineLongPressTimer) { clearTimeout(inlineLongPressTimer); inlineLongPressTimer = null; }
  }, { capture: true, passive: true });

  // Inline paragraph translation — direct mode (hover to translate)
  document.addEventListener('mouseover', (e) => {
    if (!currentSettings?.enabled || !currentSettings?.inlineParagraphTrigger || currentSettings.inlineParagraphTrigger === 'none') return;
    if (currentSettings.inlineParagraphTrigger !== 'direct') return;
    const target = e.target as HTMLElement;
    if (target.closest('rubi-ui-root') || target.closest('.rubi-paragraph-translation')) return;
    const paragraph = findParagraph(target);
    if (!paragraph || paragraph === lastDirectTranslatedParagraph) return;
    if ((paragraph as any)._rubi_translation_block || paragraph.querySelector(':scope > .rubi-paragraph-translation') || paragraph.nextElementSibling?.classList.contains('rubi-paragraph-translation')) return;
    lastDirectTranslatedParagraph = paragraph;
    handleInlineParagraphTranslate(paragraph);
  }, { capture: true, passive: true });
}

// ─── Fallback Helper ──────────────────────────────────────────
function getFallbackWordLength(text: string): number {
  if (!text) return 0;
  
  const numberMatch = text.match(/^[0-9０-９,\.一二三四五六七八九十百千万億兆]+/);
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
  
  const generalMatch = text.match(/^[^\s、。！？\[\]\(\)\{\}「」『』のにはがとでも]+/);
  if (generalMatch) {
    return Math.min(generalMatch[0].length, 6);
  }
  
  return 1;
}

// ─── Word Sourcing & Highlighting ───────────────────────────
async function handleMouseMove(e: MouseEvent) {
  if (uiState.translationBadge.pinned) return;

  try {
    await loadDictionary();

    const scanResult = getTextAtPoint({
      point: { x: e.clientX, y: e.clientY },
      maxLength: 16
    });

    if (!scanResult || !scanResult.text || !scanResult.textRange) {
      immediateHide();
      return;
    }

    let matchedWord: string | null = null;
    let matchedReading: string = '';
    let matchedEntry: any = null;
    let matchedLength = -1;
    let isAiFallback = false;

    const match = await lookupWord(scanResult.text);
    
    if (match) {
      matchedWord = match.word;
      matchedEntry = match.entry;
      matchedLength = match.length;
    }

    const startsWithKatakana = /^[\u30a0-\u30ffー]/.test(scanResult.text);
    const startsWithKanji = /^[\u4e00-\u9fff]/.test(scanResult.text);
    const startsWithNumber = /^[0-9０-９]/.test(scanResult.text);

    const katakanaBlockLen = startsWithKatakana ? (scanResult.text.match(/^[\u30a0-\u30ffー]+/)?.[0].length || 0) : 0;
    if (katakanaBlockLen > 0 && matchedLength < katakanaBlockLen) {
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

      // Fallback if not strictly over (should not happen if ranges > 0 but just in case)
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
        } else {
          console.warn('[Rubi] CSS.highlights is not supported in this browser!');
        }

        const rect = targetRect;
        const translationStr = matchedEntry?.m?.length ? matchedEntry.m.join('; ') : '';
        const displayReading = matchedReading || matchedEntry?.r || '';

        // Create a closure that re-fetches the specific client rect on scroll
        const getRect = () => {
          const currentRects = targetRange!.getClientRects();
          return currentRects.length > targetRectIndex ? currentRects[targetRectIndex] : currentRects[0];
        };

        // 1. Show Top Pronounce Badge (Japanese Word & Hiragana Reading)
        uiActions.showPronounceBadge(
          displayReading || (isAiFallback ? '...' : ''), // Pass '...' for AI fallback to show loading dots, empty string otherwise
          rect,
          false,
          matchedEntry?.lemma || matchedWord,
          '', // pass empty translation here as it goes to translation badge!
          false,
          getRect
        );

        const trigger = currentSettings?.translationTrigger || 'hover';
        if (trigger === 'hover') {
          const pos = (currentSettings?.translationPosition === 'pronounce-badge' ? 'bottom' : currentSettings?.translationPosition) || 'bottom';
          const showEngine = currentSettings?.showTranslationEngine ?? true;
          const targetLang = currentSettings?.targetLanguage || 'zh-CN';
          const wordSnapshot = matchedWord;

          if (matchedEntry?.isAiFallback) {
            // AI translation only (forced because of dictionary miss)
            uiActions.showTranslationBadge(
              'AI 翻译中...',
              'AI',
              rect as DOMRect,
              false, // Not pinned on hover
              pos,
              showEngine,
              'ai',
              matchedWord
            );

            safeSendMessage({
              type: 'CONTEXTUAL_TRANSLATE',
              word: matchedWord,
              sentence: getSentenceContext()
            }).then((resp: any) => {
              if (currentWord !== wordSnapshot) return;
              if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return;
              
              if (resp?.reading) {
                uiActions.updatePronounceBadgeContent(resp.reading);
              }

              const result = resp?.translation || 'AI 翻译失败';
              const activeRect = getRect();
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
            }).catch((err: any) => {
              if (currentWord !== wordSnapshot) return;
              if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return;
              const activeRect = getRect();
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
            });
          } else {
            const engine = currentSettings?.translationEngine || 'none';
            if (engine === 'none') {
              // ── Local dictionary only ──────────────────────────────
              uiActions.showTranslationBadge(
                `${matchedWord} (${translationStr})`,
                'DICT',
                rect as DOMRect,
                false,
                pos,
                showEngine,
                'dict',
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
                const activeRect = getRect();
                uiActions.showTranslationBadge(
                  result,
                  resp?.targetText ? (resp.engine || engine) : 'DICT',
                  activeRect,
                  false, // Not pinned on hover
                  pos,
                  showEngine,
                  'machine',
                  wordSnapshot,
                  resp?.errorInfo
                );
              }).catch(() => {
                // API failed — fall back to dictionary result silently
                if (currentWord !== wordSnapshot) return;
                if (uiState.translationBadge.pinned && uiState.translationBadge.askMode) return; // AI analysis is open
                const activeRect = getRect();
                uiActions.showTranslationBadge(
                  `${matchedWord} (${translationStr})`,
                  'DICT',
                  activeRect,
                  false, // Not pinned on hover
                  pos,
                  showEngine,
                  'dict',
                  wordSnapshot
                );
              });
            }
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

function clearHoverHighlight() {
  if (typeof (CSS as any) !== 'undefined' && (CSS as any).highlights) {
    (CSS as any).highlights.delete('rubi-hover-highlight');
  }
  currentHighlightedRanges = null;
  currentWord = null;
  currentWordIsAiFallback = false;
}

// ─── Actions & Triggers ──────────────────────────────────────
async function triggerTranslation(word: string, targetRange: Range, targetRectIndex: number) {
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
      false,
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
        uiActions.updatePronounceBadgeContent(response.reading);
      }
      
      const result = response?.translation || 'AI 翻译失败';
      uiActions.showTranslationBadge(
        result,
        'AI',
        getRect(),
        false,
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
        false,
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
      false,
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
      const activeRect = getRect();
      uiActions.showTranslationBadge(
        `${word} (${translationStr})`,
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

async function triggerTTS(word: string) {
  const settings = await settingsStorage.getValue();
  speakText(word, settings);
}

async function triggerWordExplain(word: string, clientX: number, clientY: number) {
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
    false, // NOT pinned on initial show
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
      uiActions.showTranslationBadge(
        response.translation,
        'AI',
        getRect(),
        false, // NOT pinned, double click to pin and ask
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
        false,
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
      false,
      pos,
      showEngine,
      'ai',
      word
    );
  }
}

function getSentenceContext(): string {
  if (currentHighlightedRanges && currentHighlightedRanges.length > 0) {
    const parent = currentHighlightedRanges[0].startContainer.parentElement;
    if (parent) {
      return parent.textContent || '';
    }
  }
  return currentWord || '';
}

// ─── Full-page Furigana (Ruby) Injection ─────────────────────
function removeRubyAnnotations() {
  const rubies = document.querySelectorAll('ruby.rubi-injected-ruby');
  rubies.forEach(ruby => {
    const textNode = document.createTextNode(ruby.firstChild?.textContent || '');
    ruby.parentNode?.replaceChild(textNode, ruby);
  });
}

async function injectRubyAnnotations() {
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

async function processNode(node: Text, filterLevel: string) {
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
