// DOM traversal, shadow-penetrating selection and high-precision hit-testing for Japanese
export function isEditableElement(element: HTMLElement | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();

  // Input fields and textareas
  if (tagName === 'input' || tagName === 'textarea') {
    return true;
  }

  // contenteditable elements
  if (element.isContentEditable) {
    return true;
  }

  // Check parent elements
  let parent = element.parentElement;
  while (parent) {
    if (parent.isContentEditable) {
      return true;
    }
    parent = parent.parentElement;
  }

  return false;
}

export function hasEditableFocus(): boolean {
  const activeEl = document.activeElement;
  if (!activeEl) return false;

  // Ignore focus inside our own tooltips / translation badges
  if (activeEl.closest && (activeEl.closest('rubi-ui-root') || activeEl.closest('div[style*="2147483647"]'))) {
    return false;
  }

  return (
    activeEl.tagName === 'INPUT' ||
    activeEl.tagName === 'TEXTAREA' ||
    activeEl.isContentEditable ||
    activeEl.getAttribute('contenteditable') === 'true' ||
    (activeEl.closest && activeEl.closest('[contenteditable="true"]') !== null)
  );
}

export function getDeepElementFromPoint(x: number, y: number): Element | null {
  let el = document.elementFromPoint(x, y);
  while (el && el.shadowRoot) {
    const deepEl = el.shadowRoot.elementFromPoint(x, y);
    if (deepEl === el || !deepEl) break;
    el = deepEl;
  }
  return el;
}

export function containsShadowAware(parent: Element, child: Node): boolean {
  let curr: Node | null = child;
  while (curr) {
    if (curr === parent) return true;
    if (curr instanceof ShadowRoot) {
      curr = curr.host;
    } else {
      curr = curr.parentNode;
    }
  }
  return false;
}

export function getDeepCaretRangeFromPoint(x: number, y: number): Range | null {
  let range: Range | null = null;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if ((document as any).caretPositionFromPoint) {
    const pos = (document as any).caretPositionFromPoint(x, y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }

  if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
    return range;
  }

  const elAtPoint = getDeepElementFromPoint(x, y);
  if (!elAtPoint) return null;

  const textNodes: Text[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node as Text);
    } else {
      let child = node.firstChild;
      while (child) {
        walk(child);
        child = child.nextSibling;
      }
    }
  };
  walk(elAtPoint);

  if (textNodes.length === 0) return null;

  let bestNode: Text | null = null;
  let bestOffset = 0;
  let minDistance = Infinity;

  const probeRange = document.createRange();
  for (const node of textNodes) {
    const len = node.textContent?.length || 0;
    for (let i = 0; i < len; i++) {
      probeRange.setStart(node, i);
      probeRange.setEnd(node, i + 1);
      const rects = probeRange.getClientRects();
      for (let j = 0; j < rects.length; j++) {
        const rect = rects[j];
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          const r = document.createRange();
          r.setStart(node, i);
          r.collapse(true);
          return r;
        }
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.pow(cx - x, 2) + Math.pow(cy - y, 2);
        if (dist < minDistance) {
          minDistance = dist;
          bestNode = node;
          bestOffset = i;
        }
      }
    }
  }

  if (bestNode) {
    const r = document.createRange();
    r.setStart(bestNode, bestOffset);
    r.collapse(true);
    return r;
  }

  return null;
}

// Check if a character is a Japanese character (Kanji, Hiragana, Katakana, Prolonged sound mark)
export function isJapaneseChar(char: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9fffー]/.test(char);
}

// Get the character offset in a text node under the exact mouse pointer coordinates
export function getAccurateOffset(textNode: Text, clientX: number, clientY: number): number {
  const text = textNode.textContent;
  if (!text) return -1;

  const range = document.createRange();

  // Iterate each character in the text node to see if the mouse coordinates fall strictly inside
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (!isJapaneseChar(char)) continue;

    try {
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      const rect = range.getBoundingClientRect();

      // Skip invisible / collapsed characters
      if (rect.width === 0 || rect.height === 0) continue;

      if (clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {
        return i;
      }
    } catch (e) {
      // Ignore range operation errors
    }
  }

  return -1;
}
