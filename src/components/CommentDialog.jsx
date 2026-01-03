import { useState, useEffect, useRef } from 'react'

export default function CommentDialog({ selectedText, onSave, onCancel }) {
  const [comment, setComment] = useState('')
  const textareaRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    // Focus the textarea when dialog opens
    textareaRef.current?.focus()

    // Trap focus within the dialog
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return

      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, textarea, input, select, a[href]'
      )
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (comment.trim()) {
      onSave(comment)
      setComment('')
    }
  }

  const handleKeyDown = (e) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e)
    }
    // Cancel on Escape
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={dialogRef}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="dialog-title"
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
      >
        <div className="p-6">
          <h3 id="dialog-title" className="text-lg font-semibold text-gray-900 mb-4">
            Add Feedback
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Text
            </label>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-gray-800 italic">"{selectedText}"</p>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Your Feedback
            </label>
            <textarea
              ref={textareaRef}
              id="comment"
              rows="4"
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your feedback here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-gray-500 mt-1">
              Press Cmd/Ctrl + Enter to save, Esc to cancel
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!comment.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Save Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
