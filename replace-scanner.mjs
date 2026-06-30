import fs from 'fs';
const domJaPath = 'utils/dom-ja.ts';
let code = fs.readFileSync(domJaPath, 'utf8');

const newScannerCode = `
export interface NodeRange {
  node: Text;
  start: number;
  end: number;
}

export interface ScanResult {
  text: string;
  textRange: NodeRange[];
}

function isEffectiveInline(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName.toUpperCase();
  if (['RB', 'RUBY', 'SPAN', 'A', 'STRONG', 'B', 'I', 'EM', 'MARK'].includes(tag)) return true;
  const display = window.getComputedStyle(element).display;
  if (display.startsWith('inline') || display.startsWith('ruby')) return true;
  if (element.parentElement && window.getComputedStyle(element.parentElement).display === 'inline-block') return true;
  return false;
}

function getRtLevel(node: Node): number {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const rtParent = element?.closest('rt');
  if (!rtParent) return 0;
  
  let level = 0;
  let rubyAncestor = element?.closest('ruby');
  while (rubyAncestor) {
    level++;
    rubyAncestor = rubyAncestor.parentElement?.closest('ruby');
  }
  return level;
}

function isVisibleTextNode(node: Node): node is Text {
  const parent = node.parentElement;
  return (
    node.nodeType === Node.TEXT_NODE &&
    (!parent || !parent.isConnected || parent.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
  );
}

// Emulates 10ten's forward-only text scanning
export function forwardScanText(startNode: Text, startOffset: number, maxLength: number = 16): ScanResult | null {
  let inlineScope: Element | null = startNode.parentElement;
  while (isEffectiveInline(inlineScope) && inlineScope?.parentElement) {
    inlineScope = inlineScope.parentElement;
  }

  // If inside <rp>, bail
  if (startNode.parentElement?.closest('rp')) return null;

  const rtLevel = getRtLevel(startNode);
  const includeNodeText = (node: Node): node is Text => {
    if (!isVisibleTextNode(node)) return false;
    if (rtLevel > 0) {
      if (!node.parentElement?.closest('ruby')) return true;
      return getRtLevel(node) === rtLevel;
    } else {
      return !node.parentElement?.closest('rp, rt');
    }
  };

  const nodeIterator = document.createNodeIterator(
    inlineScope || startNode,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );

  // Fast forward to startNode
  while (nodeIterator.nextNode()) {
    if (nodeIterator.referenceNode === startNode) break;
  }

  if (nodeIterator.referenceNode !== startNode) return null;

  const result: ScanResult = { text: '', textRange: [] };
  let node: Text | null = startNode;
  let offset = startOffset;

  // nonJapaneseChar regex from 10ten
  const nonJapaneseChar = /[^\\u3040-\\u30ff\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3005ー]/;

  do {
    if (includeNodeText(node)) {
      const nodeText = node.data.substring(offset);
      
      let textEnd = nodeText.search(nonJapaneseChar);
      
      if (textEnd === 0) {
        break; // Hit a non-Japanese char immediately
      } else if (textEnd !== -1) {
        // Hit non-Japanese char midway
        const textToAppend = nodeText.substring(0, textEnd);
        result.text += textToAppend;
        result.textRange.push({ node, start: offset, end: offset + textEnd });
        break;
      }
      
      // Full node is Japanese
      let textToAppend = nodeText;
      let end = node.data.length;
      
      if (result.text.length + textToAppend.length > maxLength) {
        const allowedLen = maxLength - result.text.length;
        textToAppend = textToAppend.substring(0, allowedLen);
        end = offset + allowedLen;
      }

      result.text += textToAppend;
      result.textRange.push({ node, start: offset, end });
      
      if (result.text.length >= maxLength) break;
    }

    let nextNode = nodeIterator.nextNode() as Text | Element | null;
    while (nextNode && !includeNodeText(nextNode)) {
      nextNode = nodeIterator.nextNode() as Text | Element | null;
    }
    node = nextNode as Text | null;
    offset = 0;

  } while (node && inlineScope && (node.parentElement === inlineScope || isEffectiveInline(node.parentElement)));

  if (!result.textRange.length) return null;
  return result;
}
`;

// Replace the old TextScanner with this new code
code = code.replace(/export class TextScanner \{[\s\S]*\}\s*$/, newScannerCode);
fs.writeFileSync(domJaPath, code);
