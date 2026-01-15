import { useState, useRef, useCallback, useEffect } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CommentDialog from './CommentDialog'
import AnnotationList from './AnnotationList'
import { trackEvent } from '../utils/analytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

const FEEDBACK_SETTINGS_KEY = 'markdown_annotator_feedback_settings_v1'
const DEFAULT_FEEDBACK_SETTINGS = {
  header: '## Feedback\n\nGenerated with Specmark',
  includeLineNumbers: false,
}

function readFeedbackSettings() {
  if (typeof window === 'undefined') return DEFAULT_FEEDBACK_SETTINGS
  try {
    const stored = localStorage.getItem(FEEDBACK_SETTINGS_KEY)
    if (!stored) return DEFAULT_FEEDBACK_SETTINGS
    const parsed = JSON.parse(stored)
    return {
      header: typeof parsed?.header === 'string' ? parsed.header : DEFAULT_FEEDBACK_SETTINGS.header,
      includeLineNumbers: Boolean(parsed?.includeLineNumbers),
    }
  } catch (err) {
    console.warn('Failed to read feedback settings:', err)
    return DEFAULT_FEEDBACK_SETTINGS
  }
}

export default function AnnotationView({
  content,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onClearAnnotations,
}) {
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionPosition, setSelectionPosition] = useState(null)
  const [copyFallbackText, setCopyFallbackText] = useState(null)
  const [editingAnnotationId, setEditingAnnotationId] = useState(null)
  const [dialogKey, setDialogKey] = useState(0)
  const [sheetOffset, setSheetOffset] = useState(0)
  const [isSheetDragging, setIsSheetDragging] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 768px)').matches
  })
  const [exportSettings, setExportSettings] = useState(() => readFeedbackSettings())
  const [returnFocusElement, setReturnFocusElement] = useState(null)
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(FEEDBACK_SETTINGS_KEY, JSON.stringify(exportSettings))
    } catch (err) {
      console.warn('Failed to save feedback settings:', err)
    }
  }, [exportSettings])

  const handleCopyFeedback = useCallback(async () => {
    if (annotations.length === 0) return

    const feedback = generateFeedbackText(annotations, {
      header: exportSettings.header,
      includeLineNumbers: exportSettings.includeLineNumbers,
      sourceText: contentRef.current?.textContent || '',
    })
    trackEvent('Copy All', { annotations: annotations.length })

    try {
      await navigator.clipboard.writeText(feedback)
      setCopyFallbackText(null)
    } catch (err) {
      console.error('Failed to copy:', err)
      setCopyFallbackText(feedback)
    }
  }, [annotations, exportSettings])

  // Listen for copy-comments event from App.jsx header button
  useEffect(() => {
    const handleCopyEvent = () => {
      handleCopyFeedback()
    }
    window.addEventListener('specmark:copy-comments', handleCopyEvent)
    return () => window.removeEventListener('specmark:copy-comments', handleCopyEvent)
  }, [handleCopyFeedback])

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
      setReturnFocusElement(contentRef.current)
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

  const handleTooltipClick = useCallback((event) => {
    if (openingDialogRef.current || showCommentDialog) return
    // Mark that we're opening the dialog (prevents selectionchange from clearing state)
    openingDialogRef.current = true
    setReturnFocusElement(event?.currentTarget || contentRef.current)

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
    handleTooltipClick(event)
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

  const handleEditFromList = (annotation, rect, triggerElement) => {
    setReturnFocusElement(triggerElement || contentRef.current)
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Floating toggle for annotations panel (mobile has different UI) */}
      <div className="sm:hidden fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setShowAnnotations(!showAnnotations)}
          variant={showAnnotations ? 'secondary' : 'default'}
          size="icon"
          className="rounded-full shadow-lg h-12 w-12"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          {annotations.length > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full px-0 text-[10px]">
              {annotations.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Hint text */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 text-sm text-muted-foreground pointer-events-none text-center px-4 ${
          (showTooltip || showCommentDialog) && isMobile ? 'opacity-0' : ''
        }`}
      >
        <span className="hidden sm:inline">Select text to add feedback</span>
        <span className="sm:hidden">Long-press to select, tap + to comment</span>
      </div>
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 text-[11px] text-muted-foreground pointer-events-none text-center px-4">
        <span className="inline-flex items-center gap-2">
          <span className="w-6 h-3 rounded-sm annotation-mark annotation-mark-multi" aria-hidden="true" />
          Overlapping comments
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div
          ref={contentRef}
          tabIndex={-1}
          className="annotation-content bg-card text-card-foreground rounded-xl shadow-sm border border-border p-8 md:p-12 prose prose-slate max-w-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ ...props }) => (
                <div className="markdown-table">
                  <table {...props} />
                </div>
              ),
            }}
          >
            {content}
          </Markdown>
        </div>
      </div>
      </div>

      {/* Floating annotations panel - desktop */}
      {showAnnotations && annotations.length > 0 && (
        <div className="hidden sm:block fixed right-4 top-36 bottom-4 w-80 z-30">
          <AnnotationList
            annotations={annotations}
            onDeleteAnnotation={onDeleteAnnotation}
            onClearAnnotations={onClearAnnotations}
            onEditAnnotation={handleEditFromList}
            exportSettings={exportSettings}
            onExportSettingsChange={setExportSettings}
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
              exportSettings={exportSettings}
              onExportSettingsChange={setExportSettings}
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
          onClick={(event) => handleTooltipClick(event)}
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
          className="z-50 w-10 h-10 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center transition-colors hover:bg-primary/90 touch-manipulation select-none"
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
          returnFocusTo={returnFocusElement}
        />
      )}

      <Dialog
        open={Boolean(copyFallbackText)}
        onOpenChange={(open) => {
          if (!open) setCopyFallbackText(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy feedback</DialogTitle>
            <DialogDescription>
              Clipboard access failed — copy manually below.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            rows={8}
            value={copyFallbackText || ''}
            onFocus={(e) => e.target.select()}
            className="w-full font-mono text-xs"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function generateFeedbackText(annotations, { header, includeLineNumbers, sourceText } = {}) {
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

function getLineStarts(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') {
      starts.push(i + 1)
    }
  }
  return starts
}

function getLineInfo(annotation, textSource, lineStarts, lastIndexByText) {
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

function getLineNumber(lineStarts, offset) {
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

function formatQuotedText(text) {
  const safeText = typeof text === 'string' ? text : ''
  return safeText.split('\n').map((line) => `> ${line}`).join('\n')
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
