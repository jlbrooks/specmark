import { useState } from 'react'
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
  const [copySuccess, setCopySuccess] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const handleTextSelection = () => {
    const selection = window.getSelection()
    const text = selection.toString().trim()

    if (text.length > 0) {
      setSelectedText(text)
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
      setShowCommentDialog(false)
      setSelectedText('')
      // Clear the selection
      window.getSelection().removeAllRanges()
    }
  }

  const handleCancelComment = () => {
    setShowCommentDialog(false)
    setSelectedText('')
    window.getSelection().removeAllRanges()
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
    <div className="flex h-screen bg-gray-50">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Annotating Document</h1>
              <p className="text-sm text-gray-600 mt-1">
                Select text to add comments • {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onBackToEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Edit
              </button>
              <button
                onClick={handleCopyFeedback}
                disabled={annotations.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {copySuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : copyError ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Failed to copy
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Feedback
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        <div
          className="flex-1 overflow-auto p-8"
          onMouseUp={handleTextSelection}
        >
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8 prose prose-slate max-w-none">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      </div>

      {/* Sidebar with annotations */}
      <AnnotationList
        annotations={annotations}
        onDeleteAnnotation={onDeleteAnnotation}
        onClearAnnotations={onClearAnnotations}
      />

      {/* Comment dialog */}
      {showCommentDialog && (
        <CommentDialog
          selectedText={selectedText}
          onSave={handleAddComment}
          onCancel={handleCancelComment}
        />
      )}
    </div>
  )
}

function generateFeedbackText(annotations) {
  let feedback = '## Feedback on Specification\n\n'

  annotations.forEach((annotation, index) => {
    feedback += `> ${annotation.selectedText}\n\n`
    feedback += `**Feedback:** ${annotation.comment}\n\n`
    if (index < annotations.length - 1) {
      feedback += '---\n\n'
    }
  })

  return feedback
}
