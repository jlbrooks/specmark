import { useState, useRef, useCallback, useEffect } from 'react'
import Markdown from 'react-markdown'
import CommentDialog from './CommentDialog'
import AnnotationList from './AnnotationList'

export default function AnnotationView({
  content,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onClearAnnotations,
  onBackToEdit,
}) {
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionPosition, setSelectionPosition] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [copyFallbackText, setCopyFallbackText] = useState(null)
  const [editingAnnotationId, setEditingAnnotationId] = useState(null)
  const [dialogKey, setDialogKey] = useState(0)
  const [sheetOffset, setSheetOffset] = useState(0)
  const [isSheetDragging, setIsSheetDragging] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 768px)').matches
  })
  const highlightRefs = useRef([])
  const contentRef = useRef(null)
  const selectionRangeRef = useRef(null)
  const selectionOffsetsRef = useRef(null)
  const openingDialogRef = useRef(false)
  const sheetStartYRef = useRef(0)
  const sheetOffsetRef = useRef(0)
  const sheetDraggingRef = useRef(false)

  const isMobile = typeof window !== 'undefined'
    && window.matchMedia('(max-width: 640px)').matches

  // Highlight existing annotations in the content
  useEffect(() => {
    if (!contentRef.current) return

    const container = contentRef.current

    // Clear any existing annotation highlights (but not active selection)
    container.querySelectorAll('mark[data-annotation], mark[data-annotations]').forEach((mark) => {
      const parent = mark.parentNode
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark)
      }
      parent.removeChild(mark)
    })

    // Normalize text nodes after removing marks
    container.normalize()

    if (annotations.length === 0) return

    const ranges = buildAnnotationRanges(container, annotations)
    if (ranges.length === 0) return

    applyAnnotationHighlights(container, ranges)
  }, [annotations, content])

  useEffect(() => {
    const container = contentRef.current
    if (!container) return undefined

    const handleMarkClick = (event) => {
      const mark = event.target.closest('mark[data-annotation], mark[data-annotations]')
      if (!mark || !container.contains(mark)) return

      const annotationId = mark.getAttribute('data-annotation')
        || mark.getAttribute('data-annotations')?.split(',')[0]
      if (!annotationId) return

      const annotation = annotations.find((item) => item.id === annotationId)
      if (!annotation) return

      event.preventDefault()
      event.stopPropagation()

      const rect = mark.getBoundingClientRect()
      setEditingAnnotationId(annotation.id)
      setSelectedText(annotation.selectedText)
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
      setShowTooltip(false)
      setDialogKey(Date.now())
      setShowCommentDialog(true)
    }

    container.addEventListener('click', handleMarkClick)
    return () => container.removeEventListener('click', handleMarkClick)
  }, [annotations])

  const clearHighlight = useCallback(() => {
    if (highlightRefs.current.length === 0) return

    highlightRefs.current.forEach((highlight) => {
      const parent = highlight.parentNode
      if (!parent) return
      while (highlight.firstChild) {
        parent.insertBefore(highlight.firstChild, highlight)
      }
      parent.removeChild(highlight)
    })
    highlightRefs.current = []
  }, [])

  const handleTooltipClick = useCallback(() => {
    if (openingDialogRef.current || showCommentDialog) return
    // Mark that we're opening the dialog (prevents selectionchange from clearing state)
    openingDialogRef.current = true

    // Create highlight from stored range
    if (selectionRangeRef.current && contentRef.current) {
      const marks = wrapRangeInMarks(
        contentRef.current,
        selectionRangeRef.current,
        'annotation-mark-active',
        { 'data-active': 'true' },
      )
      highlightRefs.current = marks
    }

    // Clear browser selection
    window.getSelection()?.removeAllRanges()
    selectionRangeRef.current = null

    setShowTooltip(false)
    setEditingAnnotationId(null)
    setDialogKey(Date.now())
    setShowCommentDialog(true)

    // Reset the flag after a tick
    setTimeout(() => { openingDialogRef.current = false }, 0)
  }, [showCommentDialog])

  const handleTooltipPress = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    handleTooltipClick()
  }, [handleTooltipClick])

  // Listen for selection changes to show tooltip
  useEffect(() => {
    const handleSelectionChange = () => {
      if (showCommentDialog) return

      const selection = window.getSelection()
      const text = selection.toString().trim()

      if (text.length > 0 && contentRef.current) {
        try {
          const range = selection.getRangeAt(0)
          if (!contentRef.current.contains(range.commonAncestorContainer)) {
            return
          }

          const rect = range.getBoundingClientRect()

          // Store the range for later use
          selectionRangeRef.current = range.cloneRange()
          selectionOffsetsRef.current = getRangeOffsets(range, contentRef.current)

          setSelectedText(text)
          setSelectionPosition({
            x: rect.left + rect.width / 2,
            y: rect.top,
          })
          setShowTooltip(true)
        } catch {
          // Selection might be collapsed or invalid
        }
      } else if (showTooltip && !openingDialogRef.current) {
        // Selection was cleared (but not because we're opening the dialog)
        selectionRangeRef.current = null
        selectionOffsetsRef.current = null
        setShowTooltip(false)
        setSelectedText('')
        setSelectionPosition(null)
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [showCommentDialog, showTooltip])

  const handleAddComment = (comment) => {
    if (selectedText && comment.trim()) {
      if (editingAnnotationId) {
        onUpdateAnnotation(editingAnnotationId, { comment: comment.trim() })
        clearHighlight()
        setShowCommentDialog(false)
        setSelectedText('')
        setSelectionPosition(null)
        setEditingAnnotationId(null)
        return
      }

      onAddAnnotation({
        selectedText,
        comment: comment.trim(),
        timestamp: Date.now(),
        range: selectionOffsetsRef.current,
      })
      clearHighlight()
      setShowCommentDialog(false)
      setSelectedText('')
      selectionOffsetsRef.current = null
      setSelectionPosition(null)
    }
  }

  const handleCancelComment = () => {
    clearHighlight()
    setShowCommentDialog(false)
    setShowTooltip(false)
    setSelectedText('')
    selectionOffsetsRef.current = null
    setSelectionPosition(null)
    setEditingAnnotationId(null)
  }

  const handleEditFromList = (annotation, rect) => {
    setEditingAnnotationId(annotation.id)
    setSelectedText(annotation.selectedText)
    setSelectionPosition({
      x: rect?.left + rect?.width / 2 || window.innerWidth / 2,
      y: rect?.top || window.innerHeight / 2,
    })
    setShowTooltip(false)
    setDialogKey(Date.now())
    setShowCommentDialog(true)
  }

  const resetSheet = () => {
    sheetDraggingRef.current = false
    sheetOffsetRef.current = 0
    setSheetOffset(0)
    setIsSheetDragging(false)
  }

  const handleSheetTouchStart = (event) => {
    if (!showAnnotations) return
    const touch = event.touches?.[0]
    if (!touch) return
    event.preventDefault()
    sheetStartYRef.current = touch.clientY
    sheetDraggingRef.current = true
    setIsSheetDragging(true)
  }

  const handleSheetTouchMove = (event) => {
    if (!sheetDraggingRef.current) return
    const touch = event.touches?.[0]
    if (!touch) return
    event.preventDefault()
    const delta = Math.max(0, touch.clientY - sheetStartYRef.current)
    sheetOffsetRef.current = delta
    setSheetOffset(delta)
  }

  const handleSheetTouchEnd = () => {
    if (!sheetDraggingRef.current) return
    const threshold = Math.min(160, window.innerHeight * 0.25)
    if (sheetOffsetRef.current > threshold) {
      setShowAnnotations(false)
    }
    resetSheet()
  }

  const handleCopyFeedback = async () => {
    if (annotations.length === 0) return

    const feedback = generateFeedbackText(annotations)

    try {
      await navigator.clipboard.writeText(feedback)
      setCopySuccess(true)
      setCopyError(false)
      setCopyFallbackText(null)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setCopyError(true)
      setCopySuccess(false)
      setCopyFallbackText(feedback)
      setTimeout(() => setCopyError(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Floating toolbar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-white rounded-full shadow-lg border border-gray-200 px-2 py-1.5 flex flex-wrap items-center justify-center gap-1 max-w-[calc(100vw-2rem)]">
        <button
          onClick={onBackToEdit}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        >
          ← Edit
        </button>

        <div className="w-px h-5 bg-gray-200" />

        <button
          onClick={() => setShowAnnotations(!showAnnotations)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${
            showAnnotations ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          {annotations.length > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {annotations.length}
            </span>
          )}
        </button>

        <div className="w-px h-5 bg-gray-200" />

        <button
          onClick={handleCopyFeedback}
          disabled={annotations.length === 0}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {copySuccess ? (
            <>
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : copyError ? (
            <>
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Failed
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy All
            </>
          )}
        </button>
      </div>

      {/* Hint text */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 text-sm text-gray-400 pointer-events-none text-center px-4 ${
          (showTooltip || showCommentDialog) && isMobile ? 'opacity-0' : ''
        }`}
      >
        <span className="hidden sm:inline">Select text to add feedback</span>
        <span className="sm:hidden">Long-press to select, tap + to comment</span>
      </div>
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 text-[11px] text-gray-400 pointer-events-none text-center px-4">
        <span className="inline-flex items-center gap-2">
          <span className="w-6 h-3 rounded-sm annotation-mark annotation-mark-multi" aria-hidden="true" />
          Overlapping comments
        </span>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div
          ref={contentRef}
          className="annotation-content bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12 prose prose-slate max-w-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          <Markdown>{content}</Markdown>
        </div>
      </div>

      {/* Floating annotations panel */}
      {showAnnotations && annotations.length > 0 && (
        <div className="hidden sm:block fixed right-4 top-20 bottom-4 w-80 z-30">
          <AnnotationList
            annotations={annotations}
            onDeleteAnnotation={onDeleteAnnotation}
            onClearAnnotations={onClearAnnotations}
            onEditAnnotation={handleEditFromList}
          />
        </div>
      )}

      {showAnnotations && annotations.length > 0 && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowAnnotations(false)
              resetSheet()
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[70vh] px-3 pb-3"
            style={{
              transform: `translateY(${sheetOffset}px)`,
              transition: isSheetDragging ? 'none' : 'transform 200ms ease',
              overscrollBehaviorY: 'contain',
            }}
            onTouchEnd={handleSheetTouchEnd}
            onTouchCancel={handleSheetTouchEnd}
          >
            <div
              className="flex items-center justify-center pt-3 pb-4"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              style={{ touchAction: 'none' }}
            >
              <div className="w-12 h-2 rounded-full bg-gray-300" />
            </div>
            <AnnotationList
              annotations={annotations}
              onDeleteAnnotation={onDeleteAnnotation}
              onClearAnnotations={onClearAnnotations}
              onEditAnnotation={handleEditFromList}
              onClose={() => {
                setShowAnnotations(false)
                resetSheet()
              }}
              className="rounded-t-2xl"
              onHeaderTouchStart={handleSheetTouchStart}
              onHeaderTouchMove={handleSheetTouchMove}
            />
          </div>
        </div>
      )}

      {/* Floating tooltip button - positioned above selection */}
      {showTooltip && selectionPosition && (
        <button
          onClick={handleTooltipClick}
          onPointerDown={handleTooltipPress}
          onTouchStart={handleTooltipPress}
          onMouseDown={handleTooltipPress}
          style={{
            position: 'fixed',
            left: isMobile
              ? '50%'
              : `${Math.max(24, Math.min(selectionPosition.x - 20, window.innerWidth - 64))}px`,
            top: isMobile ? 'auto' : `${selectionPosition.y - 48}px`, // 40px button + 8px gap above selection
            bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 72px)' : 'auto',
            transform: isMobile ? 'translateX(-50%)' : 'none',
          }}
          className="z-50 w-10 h-10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg flex items-center justify-center transition-colors touch-manipulation select-none"
          aria-label="Add comment"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Floating comment dialog */}
      {showCommentDialog && (
        <CommentDialog
          key={dialogKey}
          selectedText={selectedText}
          position={selectionPosition}
          onSave={handleAddComment}
          onCancel={handleCancelComment}
          initialComment={annotations.find((item) => item.id === editingAnnotationId)?.comment || ''}
          submitLabel={editingAnnotationId ? 'Save' : 'Add'}
        />
      )}

      {copyFallbackText && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Copy feedback</h2>
              <button
                onClick={() => setCopyFallbackText(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">Clipboard access failed — copy manually below.</p>
            <textarea
              readOnly
              rows={8}
              value={copyFallbackText}
              onFocus={(e) => e.target.select()}
              className="w-full p-2 text-xs font-mono border border-gray-200 rounded-md bg-gray-50"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function generateFeedbackText(annotations) {
  let feedback = '## Feedback\n\n'

  annotations.forEach((annotation, index) => {
    feedback += `> ${annotation.selectedText}\n\n`
    feedback += `${annotation.comment}\n\n`
    if (index < annotations.length - 1) {
      feedback += '---\n\n'
    }
  })

  return feedback
}

function wrapRangeInMarks(container, range, className, attributes) {
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

function applyAnnotationHighlights(container, ranges) {
  const breakpoints = Array.from(new Set(ranges.flatMap((range) => [range.start, range.end])))
    .sort((a, b) => a - b)
  const nodes = getTextNodesWithOffsets(container)

  nodes.forEach(({ node, start, end }) => {
    if (end <= start) return

    // Skip text nodes that contain only whitespace
    const nodeText = node.textContent || ''
    if (nodeText.trim() === '') return

    const intersects = ranges.some((range) => range.start < end && range.end > start)
    if (!intersects) return

    const localBreaks = breakpoints.filter((point) => point > start && point < end)
    const points = [start, ...localBreaks, end]
    const fragment = document.createDocumentFragment()

    for (let i = 0; i < points.length - 1; i++) {
      const segStart = points[i]
      const segEnd = points[i + 1]
      if (segStart === segEnd) continue

      const segmentText = nodeText.slice(segStart - start, segEnd - start)
      if (!segmentText) continue

      const activeIds = ranges
        .filter((range) => range.start <= segStart && range.end >= segEnd)
        .map((range) => range.id)

      // Don't highlight whitespace-only segments (including newlines)
      if (activeIds.length === 0 || segmentText.trim() === '') {
        fragment.appendChild(document.createTextNode(segmentText))
        continue
      }

      const mark = document.createElement('mark')
      mark.className = activeIds.length > 1 ? 'annotation-mark annotation-mark-multi' : 'annotation-mark'
      mark.setAttribute('data-annotations', activeIds.join(','))
      mark.setAttribute('data-annotation', activeIds[0])
      mark.title = activeIds.length > 1 ? 'Multiple annotations' : 'Click to view annotation'
      mark.appendChild(document.createTextNode(segmentText))
      fragment.appendChild(mark)
    }

    node.parentNode.replaceChild(fragment, node)
  })
}

function getTextNodesWithOffsets(container) {
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

function getRangeOffsets(range, container) {
  if (!range || !container) return null

  const startRange = range.cloneRange()
  startRange.selectNodeContents(container)
  startRange.setEnd(range.startContainer, range.startOffset)

  const endRange = range.cloneRange()
  endRange.selectNodeContents(container)
  endRange.setEnd(range.endContainer, range.endOffset)

  let start = getTextLengthFromRange(container, startRange)
  let end = getTextLengthFromRange(container, endRange)

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (end < start) [start, end] = [end, start]

  return { start, end }
}

function getTextLengthFromRange(container, range) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let length = 0

  while (walker.nextNode()) {
    const node = walker.currentNode
    if (!range.intersectsNode(node)) continue

    const nodeRange = document.createRange()
    nodeRange.selectNodeContents(node)

    const intersection = range.cloneRange()
    intersection.selectNodeContents(node)

    if (range.compareBoundaryPoints(Range.START_TO_START, nodeRange) > 0) {
      intersection.setStart(range.startContainer, range.startOffset)
    }
    if (range.compareBoundaryPoints(Range.END_TO_END, nodeRange) < 0) {
      intersection.setEnd(range.endContainer, range.endOffset)
    }

    length += intersection.toString().length
  }

  return length
}

function buildAnnotationRanges(container, annotations) {
  const content = container.textContent || ''
  const contentLength = content.length
  const ranges = []
  const lastIndexByText = new Map()

  annotations.forEach((annotation) => {
    const rangeStart = annotation?.range?.start
    const rangeEnd = annotation?.range?.end

    if (Number.isFinite(rangeStart) && Number.isFinite(rangeEnd) && rangeEnd > rangeStart) {
      if (rangeStart >= 0 && rangeEnd <= contentLength) {
        // Trim whitespace from the range
        const rangeText = content.slice(rangeStart, rangeEnd)
        const trimmedText = rangeText.replace(/^\s+/, '') // Remove leading whitespace
        const leadingWhitespace = rangeText.length - trimmedText.length
        const trimmedStart = rangeStart + leadingWhitespace

        const finalText = trimmedText.replace(/\s+$/, '') // Remove trailing whitespace
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
