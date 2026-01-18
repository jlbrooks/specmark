export function getTextNodesWithOffsets(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodes = []
  let offset = 0

  while (walker.nextNode()) {
    const node = walker.currentNode
    const length = node.textContent.length
    nodes.push({ node, start: offset, end: offset + length })
    offset += length
  }

  return nodes
}

export function getRangeOffsets(range, container) {
  if (!range || !container) return null

  try {
    const startRange = range.cloneRange()
    startRange.selectNodeContents(container)
    startRange.setEnd(range.startContainer, range.startOffset)
    const start = startRange.toString().length

    const endRange = range.cloneRange()
    endRange.selectNodeContents(container)
    endRange.setEnd(range.endContainer, range.endOffset)
    const end = endRange.toString().length

    if (!Number.isFinite(start) || !Number.isFinite(end)) return null
    if (end < start) return { start: end, end: start }
    return { start, end }
  } catch {
    return null
  }
}

export function normalizeSelectionRange(selection, fallbackRange, container) {
  if (!selection || selection.rangeCount === 0) return fallbackRange

  const anchorNode = selection.anchorNode
  const focusNode = selection.focusNode
  if (!anchorNode || !focusNode) return fallbackRange
  if (container && (!container.contains(anchorNode) || !container.contains(focusNode))) {
    return fallbackRange
  }

  let startNode = anchorNode
  let startOffset = selection.anchorOffset ?? 0
  let endNode = focusNode
  let endOffset = selection.focusOffset ?? 0

  if (anchorNode === focusNode) {
    if (startOffset > endOffset) {
      ;[startOffset, endOffset] = [endOffset, startOffset]
    }
  } else {
    const position = anchorNode.compareDocumentPosition(focusNode)
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      startNode = focusNode
      startOffset = selection.focusOffset ?? 0
      endNode = anchorNode
      endOffset = selection.anchorOffset ?? 0
    }
  }

  try {
    const normalized = document.createRange()
    normalized.setStart(startNode, startOffset)
    normalized.setEnd(endNode, endOffset)
    return normalized
  } catch {
    return fallbackRange
  }
}
