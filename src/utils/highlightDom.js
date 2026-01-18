import { getTextNodesWithOffsets } from './selection'

export function wrapRangeInMarks(container, range, className, attributes) {
  const marks = []
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const textNodes = []

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode)
  }

  textNodes.forEach((node) => {
    if (!range.intersectsNode(node)) return

    let startOffset = 0
    let endOffset = node.textContent.length

    if (node === range.startContainer) {
      startOffset = range.startOffset
    }
    if (node === range.endContainer) {
      endOffset = range.endOffset
    }

    if (startOffset === endOffset) return
    const segmentText = node.textContent.slice(startOffset, endOffset)
    if (segmentText.trim() === '') return

    let target = node
    if (endOffset < target.textContent.length) {
      target.splitText(endOffset)
    }
    if (startOffset > 0) {
      target = target.splitText(startOffset)
    }

    const mark = document.createElement('mark')
    mark.className = className
    Object.entries(attributes || {}).forEach(([key, value]) => {
      mark.setAttribute(key, value)
    })

    target.parentNode.insertBefore(mark, target)
    mark.appendChild(target)
    marks.push(mark)
  })

  return marks
}

export function wrapOffsetsInMarks(container, range, className, attributes) {
  if (!range) return []
  const marks = []
  const nodes = getTextNodesWithOffsets(container)

  nodes.forEach(({ node, start, end }) => {
    if (range.end <= start || range.start >= end) return

    const localStart = Math.max(range.start, start) - start
    const localEnd = Math.min(range.end, end) - start
    if (localStart === localEnd) return

    const segmentText = node.textContent.slice(localStart, localEnd)
    if (segmentText.trim() === '') return

    let target = node
    if (localEnd < target.textContent.length) target.splitText(localEnd)
    if (localStart > 0) target = target.splitText(localStart)

    const mark = document.createElement('mark')
    mark.className = className
    Object.entries(attributes || {}).forEach(([key, value]) => {
      mark.setAttribute(key, value)
    })

    target.parentNode.insertBefore(mark, target)
    mark.appendChild(target)
    marks.push(mark)
  })

  return marks
}

export function wrapInSmHighlight(container, annotation, range) {
  const nodes = getTextNodesWithOffsets(container)

  nodes.forEach(({ node, start, end }) => {
    if (range.end <= start || range.start >= end) return

    const localStart = Math.max(range.start, start) - start
    const localEnd = Math.min(range.end, end) - start
    if (localStart === localEnd) return

    const segmentText = node.textContent.slice(localStart, localEnd)
    if (segmentText.trim() === '') return

    let target = node
    if (localEnd < target.textContent.length) target.splitText(localEnd)
    if (localStart > 0) target = target.splitText(localStart)

    const highlight = document.createElement('sm-highlight')
    highlight.setAttribute('data-annotation-id', annotation.id)
    highlight.setAttribute('data-has-comment', annotation.comment ? 'true' : 'false')
    target.parentNode.insertBefore(highlight, target)
    highlight.appendChild(target)
  })
}

export function buildAnnotationRanges(container, annotations) {
  const content = container.textContent || ''
  const contentLength = content.length
  const ranges = []
  const lastIndexByText = new Map()

  annotations.forEach((annotation) => {
    const rangeStart = annotation?.range?.start
    const rangeEnd = annotation?.range?.end

    if (Number.isFinite(rangeStart) && Number.isFinite(rangeEnd) && rangeEnd > rangeStart) {
      if (rangeStart >= 0 && rangeEnd <= contentLength) {
        const rangeText = content.slice(rangeStart, rangeEnd)
        const trimmedText = rangeText.replace(/^\s+/, '')
        const leadingWhitespace = rangeText.length - trimmedText.length
        const trimmedStart = rangeStart + leadingWhitespace

        const finalText = trimmedText.replace(/\s+$/, '')
        const trimmedEnd = trimmedStart + finalText.length

        if (trimmedEnd > trimmedStart) {
          ranges.push({ start: trimmedStart, end: trimmedEnd, id: annotation.id })
        }
      }
      return
    }

    const searchText = annotation.selectedText
    if (!searchText) return

    const startIndex = lastIndexByText.get(searchText) ?? 0
    const index = content.indexOf(searchText, startIndex)
    if (index === -1) return

    lastIndexByText.set(searchText, index + searchText.length)
    ranges.push({ start: index, end: index + searchText.length, id: annotation.id })
  })

  return ranges
}
