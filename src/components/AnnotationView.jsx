import { useState, useRef, useCallback, useEffect } from 'react'
import Markdown from 'react-markdown'
import CommentDialog from './CommentDialog'
import AnnotationList from './AnnotationList'

export default function AnnotationView({
  content,
  annotations,
  onAddAnnotation,
  onDeleteAnnotation,
  onClearAnnotations,
  onBackToEdit,
}) {
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionPosition, setSelectionPosition] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const highlightRef = useRef(null)
  const contentRef = useRef(null)

  // Highlight existing annotations in the content
  useEffect(() => {
    if (!contentRef.current || annotations.length === 0) return

    const container = contentRef.current

    // Clear any existing annotation highlights (but not active selection)
    container.querySelectorAll('mark[data-annotation]').forEach((mark) => {
      const parent = mark.parentNode
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark)
      }
      parent.removeChild(mark)
    })

    // Normalize text nodes after removing marks
    container.normalize()

    // Helper to find and highlight text in text nodes
    const highlightTextInNode = (node, searchText, annotationId) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const index = node.textContent.indexOf(searchText)
        if (index >= 0) {
          const range = document.createRange()
          range.setStart(node, index)
          range.setEnd(node, index + searchText.length)

          const mark = document.createElement('mark')
          mark.className = 'bg-amber-100 rounded-sm cursor-pointer hover:bg-amber-200 transition-colors'
          mark.setAttribute('data-annotation', annotationId)
          mark.title = 'Click to view annotation'

          try {
            range.surroundContents(mark)
            return true
          } catch (e) {
            return false
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'MARK') {
        for (const child of Array.from(node.childNodes)) {
          if (highlightTextInNode(child, searchText, annotationId)) {
            return true
          }
        }
      }
      return false
    }

    // Apply highlights for each annotation
    annotations.forEach((annotation) => {
      highlightTextInNode(container, annotation.selectedText, annotation.id)
    })
  }, [annotations, content])

  const clearHighlight = useCallback(() => {
    if (highlightRef.current) {
      const highlight = highlightRef.current
      const parent = highlight.parentNode
      if (parent) {
        while (highlight.firstChild) {
          parent.insertBefore(highlight.firstChild, highlight)
        }
        parent.removeChild(highlight)
      }
      highlightRef.current = null
    }
  }, [])

  const handleTextSelection = () => {
    const selection = window.getSelection()
    const text = selection.toString().trim()

    if (text.length > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // Create highlight element (blue for active selection)
      try {
        const highlight = document.createElement('mark')
        highlight.className = 'bg-blue-200 ring-2 ring-blue-300 rounded-sm'
        highlight.setAttribute('data-active', 'true')
        range.surroundContents(highlight)
        highlightRef.current = highlight
      } catch (e) {
        // surroundContents can fail if selection spans multiple elements
        // Fall back to no highlight in that case
      }

      // Clear the browser selection
      selection.removeAllRanges()

      setSelectedText(text)
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom,
      })
      setShowCommentDialog(true)
    }
  }

  const handleAddComment = (comment) => {
    if (selectedText && comment.trim()) {
      onAddAnnotation({
        selectedText,
        comment: comment.trim(),
        timestamp: Date.now(),
      })
      clearHighlight()
      setShowCommentDialog(false)
      setSelectedText('')
      setSelectionPosition(null)
    }
  }

  const handleCancelComment = () => {
    clearHighlight()
    setShowCommentDialog(false)
    setSelectedText('')
    setSelectionPosition(null)
  }

  const handleCopyFeedback = async () => {
    if (annotations.length === 0) return

    const feedback = generateFeedbackText(annotations)

    try {
      await navigator.clipboard.writeText(feedback)
      setCopySuccess(true)
      setCopyError(false)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setCopyError(true)
      setCopySuccess(false)
      setTimeout(() => setCopyError(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Floating toolbar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-white rounded-full shadow-lg border border-gray-200 px-2 py-1.5 flex items-center gap-1">
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
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 text-sm text-gray-400 pointer-events-none">
        Select text to add feedback
      </div>

      {/* Main content */}
      <div
        className="max-w-3xl mx-auto px-6 py-20"
        onMouseUp={handleTextSelection}
      >
        <div
          ref={contentRef}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12 prose prose-slate max-w-none"
        >
          <Markdown>{content}</Markdown>
        </div>
      </div>

      {/* Floating annotations panel */}
      {showAnnotations && annotations.length > 0 && (
        <div className="fixed right-4 top-20 bottom-4 w-80 z-30">
          <AnnotationList
            annotations={annotations}
            onDeleteAnnotation={onDeleteAnnotation}
            onClearAnnotations={onClearAnnotations}
          />
        </div>
      )}

      {/* Floating comment dialog */}
      {showCommentDialog && (
        <CommentDialog
          selectedText={selectedText}
          position={selectionPosition}
          onSave={handleAddComment}
          onCancel={handleCancelComment}
        />
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
