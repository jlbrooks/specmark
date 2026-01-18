export function generateFeedbackText(annotations, { header, includeLineNumbers, sourceText } = {}) {
  const normalizedHeader = typeof header === 'string' ? header.trim() : ''
  const textSource = typeof sourceText === 'string' ? sourceText : ''
  const lineStarts = includeLineNumbers && textSource ? getLineStarts(textSource) : []
  const lastIndexByText = new Map()

  let feedback = ''
  if (normalizedHeader) {
    feedback += `${normalizedHeader}\n\n`
  }

  annotations.forEach((annotation, index) => {
    const lineInfo = includeLineNumbers
      ? getLineInfo(annotation, textSource, lineStarts, lastIndexByText)
      : null
    const heading = lineInfo
      ? `### ${index + 1}. ${lineInfo}`
      : `### ${index + 1}.`

    feedback += `${heading}\n\n`
    feedback += `${formatQuotedText(annotation.selectedText)}\n\n`
    feedback += `${annotation.comment}\n\n`
  })

  return feedback.trim() + '\n'
}

export function getLineStarts(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') {
      starts.push(i + 1)
    }
  }
  return starts
}

export function getLineInfo(annotation, textSource, lineStarts, lastIndexByText) {
  if (!textSource) return null

  let start = annotation?.range?.start
  let end = annotation?.range?.end

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    const selectedText = annotation?.selectedText
    if (!selectedText) return null
    const fromIndex = lastIndexByText.get(selectedText) ?? 0
    const foundIndex = textSource.indexOf(selectedText, fromIndex)
    if (foundIndex === -1) return null
    start = foundIndex
    end = foundIndex + selectedText.length
    lastIndexByText.set(selectedText, end)
  }

  const startLine = getLineNumber(lineStarts, start)
  const endLine = getLineNumber(lineStarts, Math.max(start, end - 1))

  if (!startLine || !endLine) return null
  if (startLine === endLine) return `Line ${startLine}`
  return `Lines ${startLine}-${endLine}`
}

export function getLineNumber(lineStarts, offset) {
  let low = 0
  let high = lineStarts.length - 1
  let result = 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const start = lineStarts[mid]
    if (start <= offset) {
      result = mid + 1
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return result
}

export function formatQuotedText(text) {
  const safeText = typeof text === 'string' ? text : ''
  return safeText.split('\n').map((line) => `> ${line}`).join('\n')
}
