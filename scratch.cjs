const fullRange = {
    startContainer: { textContent: "て風が強くな", nodeType: 3 },
    startOffset: 1, // "風"
    endContainer: { textContent: "て風が強くな", nodeType: 3 },
    endOffset: 5,   // "く"
    commonAncestorContainer: { textContent: "て風が強くな", nodeType: 3 }
};
const nodes = [ fullRange.commonAncestorContainer ];
const wStart = 2;
const wEnd = 2;

let currentLen = 0;
let startNode = null;
let startOffset = 0;
let endNode = null;
let endOffset = 0;

for (const node of nodes) {
    const nodeStartOffset = node === fullRange.startContainer ? fullRange.startOffset : 0;
    const nodeEndOffset = node === fullRange.endContainer ? fullRange.endOffset : node.textContent.length;
    const nodeLen = nodeEndOffset - nodeStartOffset;

    if (!startNode && currentLen + nodeLen > wStart) {
        startNode = node;
        startOffset = nodeStartOffset + (wStart - currentLen); // 1 + (2 - 0) = 3
    }

    if (startNode && currentLen + nodeLen > wEnd) {
        endNode = node;
        endOffset = nodeStartOffset + (wEnd - currentLen) + 1; // 1 + (2 - 0) + 1 = 4
        break;
    }

    currentLen += nodeLen;
}
console.log("startOffset:", startOffset, "endOffset:", endOffset);
