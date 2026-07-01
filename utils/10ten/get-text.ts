import type { Point } from './geometry';
import { bboxIncludesPoint } from './geometry';
import { getBboxForSingleCodepointRange, getRangeForSingleCodepoint } from './range';
import { getCursorPosition, isTextInputPosition, isTextNodePosition, type CursorPosition } from './get-cursor-position';
import { scanText, type ScanTextResult } from './scan-text';
import type { TextRange } from './text-range';

export type GetTextAtPointResult = Omit<ScanTextResult, 'textRange'> & {
  textRange: TextRange | null;
  startElement: Element;
};

let previousResult:
  | {
      point: Point;
      position: CursorPosition | undefined;
      result: GetTextAtPointResult;
      firstCharBbox?: DOMRect;
    }
  | undefined;

export function getTextAtPoint({
  point,
  maxLength,
}: {
  point: Point;
  maxLength?: number;
}): GetTextAtPointResult | null {
  if (
    previousResult?.firstCharBbox &&
    bboxIncludesPoint({ bbox: previousResult.firstCharBbox, point })
  ) {
    return previousResult.result;
  }

  const elements = [...new Set(document.elementsFromPoint(point.x, point.y))];

  const position = getCursorPosition({ point, elements });
  let scanNode: Text | null = null;

  if (isTextInputPosition(position)) {
    if (position.offset === (position.offsetNode as HTMLInputElement).value.length) {
      return null;
    }
    scanNode = document.createTextNode((position.offsetNode as HTMLInputElement).value);
  }

  if (
    position &&
    position.offsetNode === previousResult?.position?.offsetNode &&
    position.offset === previousResult?.position?.offset
  ) {
    return previousResult.result;
  }

  const synthesizedPosition = position
    ? { offsetNode: scanNode || position.offsetNode, offset: position.offset }
    : undefined;

  if (position && isTextNodePosition(synthesizedPosition)) {
    const scanResult = scanText({
      startPosition: synthesizedPosition as CursorPosition<Text>,
      maxLength,
    });

    if (scanResult) {
      const result: GetTextAtPointResult = {
        ...scanResult,
        startElement: position.offsetNode.parentElement || (position.offsetNode as unknown as Element),
      };

      if (position.offsetNode !== synthesizedPosition.offsetNode) {
        (result.textRange![0].node as unknown) = position.offsetNode as Text;
      }

      previousResult = {
        point,
        position,
        result,
        firstCharBbox: getFirstCharBbox(position),
      };

      return result;
    }
  }

  if (previousResult) {
    const dx = previousResult.point.x - point.x;
    const dy = previousResult.point.y - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) {
      return previousResult.result;
    }
  }

  previousResult = undefined;
  return null;
}

function getFirstCharBbox(position: CursorPosition): DOMRect | undefined {
  if (!isTextNodePosition(position as any)) {
    return undefined;
  }

  const firstCharRange = getRangeForSingleCodepoint({
    source: position.offsetNode as Text,
    offset: position.offset,
  });

  if (firstCharRange.collapsed) {
    return undefined;
  }

  return getBboxForSingleCodepointRange(firstCharRange);
}
