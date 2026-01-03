import { useState, useEffect, useRef } from 'react'

export default function CommentDialog({ selectedText, position, onSave, onCancel }) {
  const [comment, setComment] = useState('')
  const textareaRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        onCancel()
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onCancel])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (comment.trim()) {
      onSave(comment)
      setComment('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e)
    }
  }

  // Calculate position - try to show below selection, but flip if near bottom
  const style = {}
  if (position) {
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const dialogHeight = 200
    const dialogWidth = 320

    // Position horizontally - center on selection, but keep in viewport
    let left = position.x - dialogWidth / 2
    left = Math.max(16, Math.min(left, viewportWidth - dialogWidth - 16))

    // Position vertically - prefer below, flip to above if needed
    let top = position.y + 8
    if (top + dialogHeight > viewportHeight - 16) {
      top = position.y - dialogHeight - 8
    }

    style.left = `${left}px`
    style.top = `${top}px`
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      style={style}
      className="fixed z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
    >
      <div className="bg-blue-50 border-b border-blue-100 px-3 py-2">
        <p className="text-xs text-blue-800 truncate" title={selectedText}>
          "{selectedText.length > 50 ? selectedText.slice(0, 50) + '...' : selectedText}"
        </p>
      </div>

      <div className="p-3">
        <textarea
          ref={textareaRef}
          rows="3"
          className="w-full p-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Add your feedback..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">⌘↵ to save</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!comment.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
