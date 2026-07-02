import { reactive } from 'vue';

export interface MenuItem {
  icon?: string;
  label: string;
  type?: 'header' | 'divider' | 'item' | 'info';
  onClick?: () => void;
  onSpeakClick?: () => void;
  onMouseLeave?: () => void;
  rubyChunks?: RubyChunkState[];
}

export interface RubyChunkState {
  reading: string;
  centerOffset: number;
}

export interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
}

function toRect(rect: DOMRect | null, exactRect = false): Rect | null {
  if (!rect) return null;
  const rawRect = {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
  if (exactRect) return rawRect;
  return nearestLineRect(rawRect);
}

let _lastInteractionY = 0;
export function setLastInteractionY(y: number) { _lastInteractionY = y; }

export function getLineRect(el: HTMLElement, clientY: number): DOMRect {
  const rects = el.getClientRects();
  for (const r of rects) {
    if (clientY >= r.top && clientY <= r.bottom) {
      return r;
    }
  }
  let closest = el.getBoundingClientRect();
  let minDist = Infinity;
  for (const r of rects) {
    const centerY = r.top + r.height / 2;
    const dist = Math.abs(clientY - centerY);
    if (dist < minDist) {
      minDist = dist;
      closest = r;
    }
  }
  return closest;
}

export function nearestLineRect(rect: Rect): Rect {
  const threshold = 50;
  if (rect.height <= threshold) return rect;

  const cursorY = _lastInteractionY;
  const estimatedLineHeight = rect.height / Math.round(rect.height / 30);
  const lineCount = Math.round(rect.height / estimatedLineHeight);
  const lineHeight = rect.height / lineCount;

  let lineIndex = Math.floor((cursorY - rect.top) / lineHeight);
  lineIndex = Math.max(0, Math.min(lineIndex, lineCount - 1));

  const lineTop = rect.top + lineIndex * lineHeight;
  return {
    top: lineTop,
    left: rect.left,
    right: rect.right,
    bottom: lineTop + lineHeight,
    width: rect.width,
    height: lineHeight,
    scrollX: rect.scrollX,
    scrollY: rect.scrollY,
  };
}

export const uiState = reactive({
  suppressClickUntil: 0,
  tooltip: {
    visible: false,
    text: '',
    rect: null as Rect | null,
  },
  pronounceBadge: {
    visible: false,
    pinned: false,
    word: null as string | null,
    content: '', // contains furigana/hiragana readings
    isHTML: false,
    rect: null as Rect | null,
    translation: null as string | null, // Stores translation for tooltip mode
    exactRect: false, // If true, places badge strictly next to the rect without expanding width
    updater: null as (() => DOMRect | null) | null,
    displayStyle: 'tooltip' as 'tooltip' | 'ruby',
    rubyChunks: [] as RubyChunkState[]
  },
  translationBadge: {
    visible: false,
    pinned: false,
    text: '',
    engine: '',
    translationType: 'dict' as 'dict' | 'machine' | 'ai',
    errorInfo: '' as string | undefined,
    rect: null as Rect | null,
    position: 'bottom' as 'top' | 'bottom',
    showEngine: true,
    exactRect: false,
    updater: null as (() => DOMRect | null) | null,
    originalText: '',
    askMode: false,
    askLoading: false,
    askAnswer: '',
    askContext: '',
  },
  returnGrace: false,
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    items: [] as MenuItem[],
  },
  longPressRing: {
    visible: false,
    pop: false,
    x: 0,
    y: 0,
  },
});

function toPlainRect(rect: DOMRect | null | any) {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function syncAction(actionName: string, ...args: any[]) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('rubi-sync-ui', {
      detail: { action: actionName, args }
    });
    window.dispatchEvent(event);
  }
}

export const uiActions = {
  showTooltip(text: string, rect: DOMRect) {
    uiState.tooltip.text = text;
    uiState.tooltip.rect = toRect(rect);
    uiState.tooltip.visible = true;
  },
  hideTooltip() {
    uiState.tooltip.visible = false;
  },

  showPronounceBadge(content: string, rect: DOMRect, isHTML = false, word: string | null = null, translation: string | null = null, exactRect = false, updater: (() => DOMRect | null) | null = null, rubyChunks: RubyChunkState[] = [], isSync = false) {
    const b = uiState.pronounceBadge;
    const newRect = toRect(rect, exactRect);

    if (
      b.visible &&
      b.word === word &&
      b.content === content &&
      b.isHTML === isHTML &&
      newRect &&
      b.rect &&
      b.rect.top === newRect.top &&
      b.rect.left === newRect.left &&
      b.rect.width === newRect.width &&
      b.rect.height === newRect.height
    ) {
      return;
    }
    b.word = word;
    b.content = content;
    b.isHTML = isHTML;
    b.rect = newRect;
    b.exactRect = exactRect;
    b.updater = updater;
    b.rubyChunks = rubyChunks;
    if (translation !== null) b.translation = translation;
    b.visible = true;

    if (!isSync) {
      syncAction('showPronounceBadge', content, toPlainRect(rect), isHTML, word, translation, exactRect, null, rubyChunks);
    }
  },
  updatePronounceBadgeTranslation(translation: string, isSync = false) {
    if (uiState.pronounceBadge.visible) {
      uiState.pronounceBadge.translation = translation;
    }
    if (!isSync) {
      syncAction('updatePronounceBadgeTranslation', translation);
    }
  },
  updatePronounceBadgeContent(content: string, isSync = false) {
    if (uiState.pronounceBadge.visible) {
      uiState.pronounceBadge.content = content;
    }
    if (!isSync) {
      syncAction('updatePronounceBadgeContent', content);
    }
  },
  updatePronounceBadgeChunks(rubyChunks: RubyChunkState[], isSync = false) {
    if (uiState.pronounceBadge.visible) {
      uiState.pronounceBadge.rubyChunks = rubyChunks;
    }
    if (!isSync) {
      syncAction('updatePronounceBadgeChunks', rubyChunks);
    }
  },
  hidePronounceBadge(isSync = false) {
    uiState.pronounceBadge.visible = false;
    uiState.pronounceBadge.pinned = false;
    uiState.pronounceBadge.word = null;
    uiState.pronounceBadge.translation = null;
    if (!isSync) {
      syncAction('hidePronounceBadge');
    }
  },

  showTranslationBadge(
    text: string, 
    engine: string, 
    rect: DOMRect, 
    pinned: boolean = false, 
    position: 'bottom' | 'top' = 'bottom',
    showEngine: boolean = true,
    translationType: 'dict' | 'machine' | 'ai' = 'machine',
    originalText?: string,
    errorInfo?: string,
    isSync = false
  ) {
    if (uiState.suppressClickUntil > Date.now() && !isSync) return;

    uiState.translationBadge.text = text;
    uiState.translationBadge.engine = engine;
    uiState.translationBadge.rect = toRect(rect);
    uiState.translationBadge.pinned = pinned;
    uiState.translationBadge.position = position;
    uiState.translationBadge.showEngine = showEngine;
    uiState.translationBadge.translationType = translationType;
    uiState.translationBadge.originalText = originalText || '';
    uiState.translationBadge.errorInfo = errorInfo;
    uiState.translationBadge.askMode = false;
    uiState.translationBadge.askLoading = false;
    uiState.translationBadge.askAnswer = '';
    uiState.translationBadge.askContext = '';
    
    // Slight delay to ensure content updates before showing
    setTimeout(() => {
      uiState.translationBadge.visible = true;
    }, 10);
    
    if (!isSync) {
      syncAction('showTranslationBadge', text, engine, toPlainRect(rect), pinned, position, showEngine, translationType, originalText, errorInfo);
    }
  },
  hideTranslationBadge(isSync = false, suppressNext = false) {
    uiState.translationBadge.visible = false;
    uiState.translationBadge.pinned = false;
    uiState.translationBadge.askMode = false;
    uiState.translationBadge.askLoading = false;
    uiState.translationBadge.askAnswer = '';
    uiState.translationBadge.askContext = '';
    // Only suppress the next show() when the user explicitly clicked to dismiss.
    // Hover-out dismissals should NOT suppress, so moving to a new word works immediately.
    if (suppressNext) uiState.suppressClickUntil = Date.now() + 300;
    if (!isSync) {
      syncAction('hideTranslationBadge');
    }
  },
  enterAskMode() {
    uiState.translationBadge.askMode = true;
    uiState.translationBadge.pinned = true;
  },
  exitAskMode() {
    uiState.translationBadge.askMode = false;
    uiState.translationBadge.askLoading = false;
    uiState.translationBadge.askAnswer = '';
  },
  setAskAnswer(answer: string) {
    uiState.translationBadge.askAnswer = answer;
    uiState.translationBadge.askLoading = false;
  },

  showContextMenu(items: MenuItem[], x: number, y: number, isSync = false) {
    uiState.contextMenu.items = items;
    uiState.contextMenu.x = x;
    uiState.contextMenu.y = y;
    uiState.contextMenu.visible = true;
    if (!isSync) {
      syncAction('showContextMenu', items, x, y);
    }
  },
  updateContextMenuItem(index: number, item: Partial<MenuItem>, isSync = false) {
    const current = uiState.contextMenu.items[index];
    if (!current) return;
    uiState.contextMenu.items[index] = { ...current, ...item };
    if (!isSync) {
      syncAction('updateContextMenuItem', index, item);
    }
  },
  hideContextMenu(isSync = false) {
    uiState.contextMenu.visible = false;
    if (!isSync) {
      syncAction('hideContextMenu');
    }
  },

  showLongPressRing(x: number, y: number) {
    uiState.longPressRing.x = x;
    uiState.longPressRing.y = y;
    uiState.longPressRing.pop = false;
    uiState.longPressRing.visible = true;
  },
  popLongPressRing() {
    uiState.longPressRing.pop = true;
    setTimeout(() => {
      uiState.longPressRing.visible = false;
      uiState.longPressRing.pop = false;
    }, 250);
  },
  hideLongPressRing() {
    uiState.longPressRing.visible = false;
    uiState.longPressRing.pop = false;
  },
  
  updateActiveRects() {
    // In Ask AI mode, keep the badge fixed at its original position
    const isAskMode = uiState.translationBadge.pinned && uiState.translationBadge.askMode;

    if (uiState.translationBadge.visible && uiState.translationBadge.updater && !isAskMode) {
      const newRect = uiState.translationBadge.updater();
      if (newRect) uiState.translationBadge.rect = toRect(newRect, uiState.translationBadge.exactRect);
    }
    if (uiState.pronounceBadge.visible && uiState.pronounceBadge.updater && !isAskMode) {
      const newRect = uiState.pronounceBadge.updater();
      if (newRect) uiState.pronounceBadge.rect = toRect(newRect, uiState.pronounceBadge.exactRect);
    }
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('rubi-sync-ui', (e: Event) => {
    const customEvent = e as CustomEvent<{ action: string; args: any[] }>;
    const { action, args } = customEvent.detail;
    const method = (uiActions as any)[action];
    if (typeof method === 'function') {
      try {
        method(...args, true);
      } catch (err) {
        console.error('[Rubi-DEBUG] Sync action execution failed:', action, err);
      }
    }
  });
}
