/**
 * Rubi Event Manager
 *
 * Attaches and coordinates all document-level event listeners:
 *   - Mouse move and hover checking
 *   - Long press ring & AI explain trigger
 *   - Quick click TTS speak
 *   - Context menu interception
 *   - Hotkey modifiers (Shift / Alt / Ctrl / Custom)
 */

import { uiActions, uiState, setLastInteractionY } from '@/utils/content-state';
import { settingsStorage } from '@/utils/storage';
import { isEditableElement, hasEditableFocus } from '@/utils/dom-ja';
import { extractRuby } from '@/utils/ruby-extractor';
import { isEnabled, currentSettings } from './content-context';
import {
  getEffectiveFuriganaState,
  setLocalFuriganaState,
  injectRubyAnnotations,
  removeRubyAnnotations
} from './furigana-injector';
import {
  findParagraph,
  handleInlineParagraphTranslate
} from './paragraph-translator';
import {
  currentWord,
  currentHighlightedRanges,
  currentMatchedEntry,
  isMouseOverPopup,
  setIsMouseOverPopup,
  cancelScheduledHide,
  scheduleHide,
  handleMouseMove,
  triggerTTS,
  triggerTranslation,
  triggerWordExplain
} from './word-lookup';

export function setupEventListeners(): void {
  let isThrottled = false;
  let lastMouseTarget: HTMLElement | null = null;
  let inlineLongPressTimer: ReturnType<typeof setTimeout> | null = null;
  let lastDirectTranslatedParagraph: HTMLElement | null = null;

  let lastMouseX = 0;
  let lastMouseY = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let ringDelayTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressActive = false;

  window.addEventListener('scroll', () => {
    uiActions.updateActiveRects();
    uiActions.hideLongPressRing();
  });

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
      setIsMouseOverPopup(true);
      cancelScheduledHide();
      return;
    }

    if (isMouseOverPopup) {
      setIsMouseOverPopup(false);
      if (uiState.translationBadge.pinned) return;
    }

    if (hasEditableFocus()) return;
    const targetElement = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (isEditableElement(targetElement)) return;

    if (currentHighlightedRanges && currentWord) {
      let stillOverWord = false;
      const padding = 4;
      
      for (let j = 0; j < currentHighlightedRanges.length; j++) {
        const hlRects = currentHighlightedRanges[j].getClientRects();
        for (let i = 0; i < hlRects.length; i++) {
          const r = hlRects[i];
          if (e.clientX >= r.left - padding && e.clientX <= r.right + padding &&
              e.clientY >= r.top - padding && e.clientY <= r.bottom + padding) {
            stillOverWord = true;
            break;
          }
        }
        if (stillOverWord) break;
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
    if (!isEnabled || e.button !== 0) return;
    if (ringDelayTimer) {
      clearTimeout(ringDelayTimer);
      ringDelayTimer = null;
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    uiActions.hideLongPressRing();

    const path = e.composedPath ? e.composedPath() : [];
    if (path.some((el: any) => 
      (el.tagName && el.tagName.toLowerCase() === 'rubi-ui-root') ||
      el.id === 'rubi-translation-badge' ||
      el.id === 'rubi-pronounce-badge'
    )) {
      longPressActive = false;
      return;
    }

    if (currentHighlightedRanges && currentWord && !longPressActive) {
      if (uiState.contextMenu.visible) {
        longPressActive = false;
        return;
      }

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

  let lastClickTime = 0;
  let lastContextMenuTime = 0;

  document.addEventListener('contextmenu', (e) => {
    if (!isEnabled) return;
    if (currentSettings?.enableCustomContextMenu === false) return;
    
    let targetWord = '';
    
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    let isInsideHighlight = false;
    if (currentHighlightedRanges) {
      const padding = 15;
      for (const hlRange of currentHighlightedRanges) {
        const rects = hlRange.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (e.clientX >= r.left - padding && e.clientX <= r.right + padding &&
              e.clientY >= r.top - padding && e.clientY <= r.bottom + padding) {
            isInsideHighlight = true;
            break;
          }
        }
        if (isInsideHighlight) break;
      }
    }
    
    if (!isInsideHighlight && isMouseOverPopup && currentWord) {
      isInsideHighlight = true;
    }
    
    if (selectedText) {
      targetWord = selectedText;
    } else if (isInsideHighlight && currentWord) {
      targetWord = currentWord;
      if (currentMatchedEntry && currentMatchedEntry.lemma && currentMatchedEntry.lemma !== currentWord) {
         targetWord = currentMatchedEntry.lemma;
      }
    }

    if (targetWord) {
      e.preventDefault();
      
      let rubyChunks: any[] | undefined = undefined;
      if (currentMatchedEntry && isInsideHighlight && !selectedText) {
          const matchedReading = currentMatchedEntry.r || '';
          const { chunks } = extractRuby(targetWord, matchedReading, currentMatchedEntry.lemma || targetWord, !!currentMatchedEntry.isAiFallback);
          if (chunks.length > 0) {
              rubyChunks = chunks;
          }
      }
      
      const items: any[] = [
        {
          label: targetWord,
          type: 'header',
          rubyChunks,
          onSpeakClick: () => triggerTTS(targetWord)
        },
        { type: 'divider' }
      ];

      let config = currentSettings?.customMenuConfig;
      if (!Array.isArray(config)) {
        if (config && typeof config === 'object') {
          config = Object.values(config) as any[];
        } else {
          config = [
            { id: 'translate', enabled: true },
            { id: 'furigana', enabled: true },
            { id: 'explain', enabled: true },
            { id: 'weblio', enabled: true },
            { id: 'jisho', enabled: true },
            { id: 'wikipedia', enabled: true },
            { id: 'google', enabled: true },
            { id: 'x', enabled: true }
          ];
        }
      }

      const actions: Record<string, any> = {
        translate: {
          label: '翻译当前段落',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>',
          onClick: () => {
             const paragraph = findParagraph(e.target as HTMLElement);
             if (paragraph) handleInlineParagraphTranslate(paragraph);
          }
        },
        furigana: {
          label: '全文注音',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>',
          onClick: () => {
             const nextState = !getEffectiveFuriganaState();
             setLocalFuriganaState(nextState);
             if (nextState) injectRubyAnnotations();
             else removeRubyAnnotations();
          }
        },
        explain: {
          label: 'AI 翻译',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
          onClick: () => {
             triggerWordExplain(targetWord, e.clientX, e.clientY);
          }
        },
        weblio: {
          label: '在 Weblio 词典中查询',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>',
          onClick: () => {
             window.open(`https://www.weblio.jp/content/${encodeURIComponent(targetWord)}`, '_blank');
          }
        },
        jisho: {
          label: '在 Jisho 词典中查询',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
          onClick: () => {
             window.open(`https://jisho.org/search/${encodeURIComponent(targetWord)}`, '_blank');
          }
        },
        wikipedia: {
          label: '在维基百科中查询',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
          onClick: () => {
             window.open(`https://ja.wikipedia.org/wiki/${encodeURIComponent(targetWord)}`, '_blank');
          }
        },
        google: {
          label: '在 Google 中搜索',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
          onClick: () => {
             window.open(`https://www.google.com/search?q=${encodeURIComponent(targetWord)}`, '_blank');
          }
        },
        x: {
          label: '在 X (Twitter) 中搜索',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>',
          onClick: () => {
             window.open(`https://twitter.com/search?q=${encodeURIComponent(targetWord)}`, '_blank');
          }
        }
      };

      for (const item of config) {
        if (item.enabled && actions[item.id]) {
          items.push(actions[item.id]);
        }
      }
      
      uiActions.showContextMenu(items, e.clientX, e.clientY);
      lastContextMenuTime = Date.now();
    }
  });

  document.addEventListener('click', (e) => {
    if (e.button !== 0) return;

    const path = e.composedPath ? e.composedPath() : [];
    const isUiClick = path.some((el: any) => 
      (el.tagName && el.tagName.toLowerCase() === 'rubi-ui-root') ||
      el.id === 'rubi-translation-badge' ||
      el.id === 'rubi-pronounce-badge'
    );
    if (!isUiClick) {
      if (Date.now() - lastContextMenuTime > 50) {
        uiActions.hideContextMenu();
      }
      
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
        if (isInside) return;
      }
      uiActions.hidePronounceBadge();
      uiActions.hideTranslationBadge();
    }
  });

  document.addEventListener('dblclick', (e) => {
    if (!isEnabled || e.button !== 0) return;

    const path = e.composedPath ? e.composedPath() : [];
    if (path.some((el: any) => 
      (el.tagName && el.tagName.toLowerCase() === 'rubi-ui-root') ||
      el.id === 'rubi-translation-badge' ||
      el.id === 'rubi-pronounce-badge'
    )) {
      return;
    }

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
    
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl) {
      const tag = activeEl.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || activeEl.isContentEditable) {
        return;
      }
    }

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
          const keyPart = parts[parts.length - 1];
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
      
      if (!currentSettings?.enableFuriganaRuby) return;

      const nextFuriganaState = !getEffectiveFuriganaState();
      setLocalFuriganaState(nextFuriganaState);
      if (nextFuriganaState) {
        injectRubyAnnotations();
      } else {
        removeRubyAnnotations();
      }
    }
  });

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
