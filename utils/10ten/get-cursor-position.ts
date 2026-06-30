import { isElement, isTextInputNode, isTextNode } from './dom-utils';
import { bboxIncludesPoint, getBboxForNodeList, type Point, type Rect } from './geometry';
import { getBboxForSingleCodepointRange, getRangeForSingleCodepoint } from './range';

export type CursorPosition<T extends Node = Node> = {
  offset: number;
  offsetNode: T;
};

export function getCursorPosition({
  point,
  elements: initialElements,
}: {
  point: Point;
  elements: ReadonlyArray<Element>;
}): CursorPosition | null {
  if (!initialElements.length) {
    return null;
  }

  const initialResult = getCursorPositionForElement({
    point,
    element: initialElements[0],
  });

  if (isTextNodePosition(initialResult) || isTextInputPosition(initialResult)) {
    return initialResult;
  }

  const stylesToRestore = new Map<Element, string | null>();

  try {
    const elements = [...initialElements];
    let firstElement = true;

    for (
      let element = elements.shift();
      element;
      element = elements.shift(), firstElement = false
    ) {
      if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
        continue;
      }

      const treatElementAsInvisible =
        firstElement &&
        (getComputedStyle(element).zIndex !== 'auto' || isVisiblyEmptyElement(element));
      
      if (!treatElementAsInvisible && isVisible(element)) {
        continue;
      }

      stylesToRestore.set(element, element.getAttribute('style'));
      element.style.setProperty('pointer-events', 'none', 'important');

      const result = getCursorPositionForElement({ point, element });
      if (isTextNodePosition(result) || isTextInputPosition(result)) {
        return result;
      }
    }
  } finally {
    restoreStyles(stylesToRestore);
  }

  return initialResult;
}

export function isTextNodePosition(
  position: CursorPosition | null | undefined
): position is CursorPosition<Text> {
  return !!position && isTextNode(position.offsetNode);
}

export function isTextInputPosition(
  position: CursorPosition | null | undefined
): position is CursorPosition<HTMLInputElement | HTMLTextAreaElement> {
  return !!position && isTextInputNode(position.offsetNode);
}

function getElementForPosition(position: CursorPosition | null | undefined): Element | null {
  return position?.offsetNode?.nodeType === Node.ELEMENT_NODE
    ? (position.offsetNode as Element)
    : position?.offsetNode?.parentElement || null;
}

function getCursorPositionForElement({
  point,
  element,
}: {
  point: Point;
  element: Element;
}): CursorPosition | null {
  let position = lookupPoint({ point, element });

  if (isTextInputPosition(position)) {
    return positionIntersectsPoint(position, point) && isVisible(position.offsetNode)
      ? position
      : null;
  }

  if (!isTextNodePosition(position)) {
    let adjustedPosition: CursorPosition | null = null;
    adjustedPosition = lookupPointWithNormalizedUserSelect({ point, element });

    if (isTextNodePosition(adjustedPosition)) {
      position = adjustedPosition;
    }
  }

  if (position && !positionIntersectsPoint(position, point)) {
    return null;
  }

  if (isTextNodePosition(position) && !isResultCloseToPoint(position, point)) {
    return null;
  }

  const positionElement = getElementForPosition(position);
  if (positionElement && !isVisible(positionElement)) {
    return null;
  }

  return position;
}

function isVisible(element: Element) {
  if ('checkVisibility' in element) {
    return (element as any).checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true,
    });
  }
  const { opacity, visibility } = getComputedStyle(element);
  return opacity !== '0' && visibility !== 'hidden';
}

function isVisiblyEmptyElement(element: Element) {
  const replacedElements = ['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'EMBED', 'OBJECT', 'INPUT'];
  return (
    element instanceof HTMLElement &&
    !replacedElements.includes(element.tagName) &&
    !element.hasChildNodes() &&
    getComputedStyle(element).backgroundColor === 'rgba(0, 0, 0, 0)' &&
    getComputedStyle(element).backgroundImage === 'none'
  );
}

function lookupPoint({ point, element }: { point: Point; element: Element }): CursorPosition | null {
  const position = getCaretPosition({ point, element });
  if (!position) return null;

  if (isTextNodePosition(position) && position.offset) {
    position.offset = getVisualOffset({ position, point });
  }

  return position;
}

function getCaretPosition({ point, element }: { point: Point; element: Element }): CursorPosition | null {
  if (typeof document.caretPositionFromPoint === 'function') {
    const position = document.caretPositionFromPoint(point.x, point.y);
    return position?.offsetNode
      ? { offset: position.offset, offsetNode: position.offsetNode }
      : null;
  }
  return caretRangeFromPoint({ point, element });
}

function getVisualOffset({ position, point }: { position: CursorPosition<Text>; point: Point }): number {
  const range = getRangeForSingleCodepoint({
    source: position.offsetNode,
    offset: position.offset,
    direction: 'backwards',
  });

  const previousCharacterBbox = getBboxForSingleCodepointRange(range);
  return previousCharacterBbox && bboxIncludesPoint({ bbox: previousCharacterBbox, point })
    ? range.startOffset
    : position.offset;
}

function lookupPointWithNormalizedUserSelect({
  point,
  element,
}: {
  point: Point;
  element: Element;
}): CursorPosition | null {
  const stylesToRestore = new Map<Element, string | null>();
  let currentElem: Element | null = element;
  while (currentElem) {
    if (!(currentElem instanceof HTMLElement) && !(currentElem instanceof SVGElement)) {
      currentElem = currentElem.parentElement;
      continue;
    }

    const { userSelect, webkitUserSelect } = getComputedStyle(currentElem as HTMLElement);
    const ok = ['auto', 'text', ''];
    if (!ok.includes(userSelect) || !ok.includes(webkitUserSelect)) {
      stylesToRestore.set(currentElem, currentElem.getAttribute('style'));
      (currentElem as HTMLElement).style.setProperty('user-select', 'text', 'important');
      (currentElem as HTMLElement).style.setProperty('-webkit-user-select', 'text', 'important');
    }
    currentElem = currentElem.parentElement;
  }

  if (!stylesToRestore.size) return null;

  const result = lookupPoint({ point, element });
  restoreStyles(stylesToRestore);

  return result;
}

function restoreStyles(styles: Map<Element, string | null>) {
  for (const [elem, style] of styles) {
    if (style) {
      elem.setAttribute('style', style);
    } else {
      elem.removeAttribute('style');
    }
  }
}

function positionIntersectsPoint(position: CursorPosition, point: Point): boolean {
  const bbox = getBboxForPosition(position);
  return !bbox || bboxIncludesPoint({ bbox, margin: 5, point });
}

function getBboxForPosition(position: CursorPosition): Rect | null {
  const node = position.offsetNode;
  if (isTextNode(node)) {
    const range = new Range();
    range.selectNode(node);
    return range.getBoundingClientRect();
  }
  if (isElement(node)) {
    if (getComputedStyle(node).display === 'contents') {
      return getBboxForNodeList(node.childNodes);
    }
    return node.getBoundingClientRect();
  }
  return null;
}

function isResultCloseToPoint(position: { offsetNode: Text; offset: number }, point: Point): boolean {
  const distanceResult = getDistanceFromTextNode(position, point);
  return !distanceResult || distanceResult.distance <= distanceResult.glyphExtent * 3;
}

function getDistanceFromTextNode(
  position: { offsetNode: Text; offset: number },
  point: Point
): { distance: number; glyphExtent: number } | null {
  const { offsetNode: node, offset } = position;
  if (!node.parentElement) return null;

  const range = getRangeForSingleCodepoint({ source: node, offset });
  const bbox = getBboxForSingleCodepointRange(range);
  if (!bbox) return null;

  const xDist = Math.min(Math.abs(point.x - bbox.left), Math.abs(point.x - bbox.right));
  const yDist = Math.min(Math.abs(point.y - bbox.top), Math.abs(point.y - bbox.bottom));

  const distance = Math.sqrt(xDist * xDist + yDist * yDist);
  const glyphExtent = Math.sqrt(bbox.width * bbox.width + bbox.height * bbox.height);

  return { distance, glyphExtent };
}

function caretRangeFromPoint({
  point,
  element,
}: {
  point: Point;
  element: Element;
}): CursorPosition | null {
  if (isTextInputNode(element)) {
    return { offset: 0, offsetNode: element }; // Simplified for inputs
  }

  const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(point.x, point.y) : null;
  if (!range) return null;

  return { offsetNode: range.startContainer, offset: range.startOffset };
}
