export function isEditableElement(element: HTMLElement | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();

  if (tagName === 'input' || tagName === 'textarea') {
    return true;
  }

  if (element.isContentEditable) {
    return true;
  }

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

  if (activeEl.closest && (activeEl.closest('rubi-ui-root') || activeEl.closest('div[style*="2147483647"]'))) {
    return false;
  }

  return (
    activeEl.tagName === 'INPUT' ||
    activeEl.tagName === 'TEXTAREA' ||
    (activeEl as HTMLElement).isContentEditable ||
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

export function isJapaneseChar(char: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9fffー]/.test(char);
}
