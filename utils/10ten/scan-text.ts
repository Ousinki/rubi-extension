import { nonJapaneseChar } from './char-range';
import type { CursorPosition } from './get-cursor-position';
import type { TextRange } from './text-range';

export type ScanTextResult = {
  text: string;
  textRange: TextRange;
};

export function scanText({
  startPosition,
  maxLength,
}: {
  startPosition: CursorPosition<Text>;
  maxLength?: number;
}): ScanTextResult | null {
  const { offsetNode: startNode, offset: startOffset } = startPosition;

  let inlineScope = startNode.parentElement;
  while (isEffectiveInline(inlineScope) && inlineScope.parentElement) {
    inlineScope = inlineScope.parentElement;
  }

  if (startNode.parentElement?.closest('rp')) {
    return null;
  }

  const rtLevel = getRtLevel(startNode);

  let includeNodeText: (node: Node) => node is Text;
  if (rtLevel > 0) {
    includeNodeText = (node): node is Text => {
      if (!isVisibleTextNode(node)) {
        return false;
      }
      if (!node.parentElement?.closest('ruby')) {
        return true;
      }
      return getRtLevel(node) === rtLevel;
    };
  } else {
    includeNodeText = (node): node is Text =>
      isVisibleTextNode(node) && !node.parentElement?.closest('rp, rt');
  }

  const nodeIterator = document.createNodeIterator(
    inlineScope || startNode,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );

  // Fast forward to start node
  do {
    const { referenceNode } = nodeIterator;
    if (referenceNode === startNode) {
      break;
    }
  } while (nodeIterator.nextNode());

  if (nodeIterator.referenceNode !== startNode) {
    return null;
  }

  let node: Text | null = startNode;
  let offset = startOffset;
  do {
    if (includeNodeText(node)) {
      const nodeText = node.data.substring(offset);
      const textStart = nodeText.search(/\S/);
      if (textStart !== -1) {
        offset += textStart;
        break;
      }
    }

    let nextNode = nodeIterator.nextNode() as Text | Element | null;
    while (nextNode && nextNode.nodeType !== Node.TEXT_NODE) {
      nextNode = nodeIterator.nextNode() as Text | Element | null;
    }
    node = nextNode as Text | null;

    if (inlineScope && node && !inlineScope.contains(node)) {
      node = null;
      break;
    }

    offset = 0;
  } while (node);

  if (!node) {
    return null;
  }

  const result: ScanTextResult = { text: '', textRange: [] };
  let textDelimiter = nonJapaneseChar;

  do {
    const nodeText = node.data.substring(offset);
    let textEnd = nodeText.search(textDelimiter);

    if (typeof maxLength === 'number' && maxLength >= 0) {
      const maxEnd = maxLength - result.text.length;
      if (textEnd === -1) {
        textEnd = node.data.length - offset >= maxEnd ? maxEnd : -1;
      } else {
        textEnd = Math.min(textEnd, maxEnd);
      }
    }

    if (textEnd === 0) {
      break;
    } else if (textEnd !== -1) {
      const textToAppend = nodeText.substring(0, textEnd);
      result.text += textToAppend;
      result.textRange.push({ node, start: offset, end: offset + textEnd });
      break;
    }

    result.text += nodeText;
    result.textRange.push({ node, start: offset, end: node.data.length });

    let nextNode = nodeIterator.nextNode() as Text | Element | null;
    while (nextNode && !includeNodeText(nextNode)) {
      nextNode = nodeIterator.nextNode() as Text | Element | null;
    }
    node = nextNode as Text | null;

    offset = 0;
  } while (
    node &&
    inlineScope &&
    (node.parentElement === inlineScope || isEffectiveInline(node.parentElement))
  );

  if (!result.textRange.length) {
    return null;
  }

  return result;
}

function isEffectiveInline(element: Element | null): element is Element {
  return (
    !!element &&
    (['RB', 'RUBY', 'SPAN'].includes(element.tagName) ||
      [
        'inline',
        'inline-block',
        'inline-flex',
        'inline-grid',
        'ruby',
        'ruby-base',
        'ruby-text',
      ].includes(getComputedStyle(element).display!) ||
      (!!element.parentElement &&
        getComputedStyle(element.parentElement)?.display === 'inline-block'))
  );
}

function isVisibleTextNode(node: Node): node is Text {
  const parent = node.parentElement;
  return (
    node.nodeType === Node.TEXT_NODE &&
    (!parent ||
      !parent.isConnected ||
      (parent as any).checkVisibility?.({
        opacityProperty: true,
        visibilityProperty: true,
      }))
  );
}

function getRtLevel(node: Node): number {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  const rtParent = element?.closest('rt');
  if (!rtParent) {
    return 0;
  }
  return getRubyLevel(rtParent);
}

function getRubyLevel(node: Node): number {
  let level =
    node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'RUBY'
      ? 1
      : 0;

  let rubyAncestor = node.parentElement?.closest('ruby');
  while (rubyAncestor) {
    level++;
    rubyAncestor = rubyAncestor.parentElement?.closest('ruby');
  }
  return level;
}
