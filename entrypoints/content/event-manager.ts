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
        const pronounceTrigger = currentSettings?.pronounceTrigger || 'click';
        if (pronounceTrigger === 'click' && now - lastClickTime > 250) {
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
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7M9 3v2c0 4.418 -2.239 8 -5 8"/><path d="M5 9c0 2.144 2.952 3.908 6.7 4"/><path d="M12 20l4 -9l4 9"/><path d="M19.1 18h-6.2"/></svg>',
          onClick: () => {
             const paragraph = findParagraph(e.target as HTMLElement);
             if (paragraph) handleInlineParagraphTranslate(paragraph);
          }
        },
        furigana: {
          label: '全文注音',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h16"/><path d="M4 19h16"/><circle cx="6" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none"/></svg>',
          onClick: () => {
             const nextState = !getEffectiveFuriganaState();
             setLocalFuriganaState(nextState);
             if (nextState) injectRubyAnnotations();
             else removeRubyAnnotations();
          }
        },
        explain: {
          label: 'AI 翻译',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>',
          onClick: () => {
             triggerWordExplain(targetWord, e.clientX, e.clientY);
          }
        },
        weblio: {
          label: '在 Weblio 词典中查询',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="2" /><text x="12" y="17" fill="currentColor" font-size="14" font-weight="bold" font-family="serif" text-anchor="middle">W</text></svg>',
          onClick: () => {
             window.open(`https://www.weblio.jp/content/${encodeURIComponent(targetWord)}`, '_blank');
          }
        },
        jisho: {
          label: '在 Jisho 词典中查询',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="2" /><text x="12" y="17" fill="currentColor" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle">辞</text></svg>',
          onClick: () => {
             window.open(`https://jisho.org/search/${encodeURIComponent(targetWord)}`, '_blank');
          }
        },
        wikipedia: {
          label: '在维基百科中查询',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.22-.812-.24l-.201-.021c-.052 0-.098-.015-.145-.051-.045-.031-.067-.076-.067-.129v-.427l.061-.045c1.247-.008 4.043 0 4.043 0l.059.045v.436c0 .121-.059.178-.193.178-.646.03-.782.095-1.023.439-.12.186-.375.589-.646 1.039l-2.301 4.273-.065.135 2.792 5.712.17.048 4.396-10.438c.154-.422.129-.722-.064-.895-.197-.172-.346-.273-.857-.295l-.42-.016c-.061 0-.105-.014-.152-.045-.043-.029-.072-.075-.072-.119v-.436l.059-.045h4.961l.041.045v.437c0 .119-.074.18-.209.18-.648.03-1.127.18-1.443.421-.314.255-.557.616-.736 1.067 0 0-4.043 9.258-5.426 12.339-.525 1.007-1.053.917-1.503-.031-.571-1.171-1.773-3.786-2.646-5.71l.053-.036z"/></svg>',
          onClick: () => {
             window.open(`https://ja.wikipedia.org/wiki/${encodeURIComponent(targetWord)}`, '_blank');
          }
        },
        google: {
          label: '在 Google 中搜索',
          icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" fill-opacity="0.9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" fill-opacity="0.6" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" fill-opacity="0.4" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" fill-opacity="0.8" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',
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
      
      if (currentSettings?.customSearchEngines) {
        for (const engine of currentSettings.customSearchEngines) {
          if (engine.enabled && engine.urlTemplate) {
            items.push({
              label: `在 ${engine.name || '自定义引擎'} 中搜索`,
              icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
              onClick: () => {
                const url = engine.urlTemplate.replace('%s', encodeURIComponent(targetWord));
                window.open(url, '_blank');
              }
            });
          }
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

        const pronounceTrigger = currentSettings?.pronounceTrigger || 'click';
        if (pronounceTrigger === 'dblclick') {
          e.preventDefault();
          e.stopPropagation();
          triggerTTS(currentWord!);
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
