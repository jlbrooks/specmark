import { useState, useEffect, useRef, useCallback } from 'react'

export default function CommentDialog({
  selectedText,
  position,
  onSave,
  onCancel,
  initialComment = '',
  submitLabel = 'Add',
}) {
  const [comment, setComment] = useState(() => initialComment)
  const textareaRef = useRef(null)
  const lastSubmitRef = useRef(0)
  const submitButtonRef = useRef(null)
  const submitRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  const submitComment = useCallback(() => {
    const now = Date.now()
    if (now - lastSubmitRef.current < 500) return

    const currentValue = textareaRef.current?.value ?? comment
    const trimmed = currentValue.trim()
    if (!trimmed) return

    lastSubmitRef.current = now
    textareaRef.current?.blur()
    onSave(trimmed)
    setComment('')
  }, [comment, onSave])

  useEffect(() => {
    submitRef.current = submitComment
  }, [submitComment])

  useEffect(() => {
    const button = submitButtonRef.current
    if (!button) return undefined

    const handleNativeSubmit = (event) => {
      if (button.disabled) return
      event.preventDefault()
      event.stopPropagation()
      submitRef.current?.()
    }

    button.addEventListener('touchend', handleNativeSubmit, { passive: false })
    button.addEventListener('pointerup', handleNativeSubmit, { passive: false })
    button.addEventListener('mouseup', handleNativeSubmit)
    button.addEventListener('click', handleNativeSubmit)

    return () => {
      button.removeEventListener('touchend', handleNativeSubmit)
      button.removeEventListener('pointerup', handleNativeSubmit)
      button.removeEventListener('mouseup', handleNativeSubmit)
      button.removeEventListener('click', handleNativeSubmit)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    submitComment()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e)
    }
  }

  // Calculate position - prefer above selection to avoid iOS menu
  const style = {}
  if (position) {
    const viewportWidth = window.innerWidth
    const dialogHeight = 200
    const dialogWidth = 320

    // Position horizontally - center on selection, but keep in viewport
    let left = position.x - dialogWidth / 2
    left = Math.max(16, Math.min(left, viewportWidth - dialogWidth - 16))

    // Position vertically - prefer above, flip to below if near top
    let top = position.y - dialogHeight - 8
    if (top < 16) {
      top = position.y + 8
    }

    style.left = `${left}px`
    style.top = `${top}px`
  }

  return (
    <>
      {/* Backdrop to catch outside clicks */}
      <div
        className="fixed inset-0 z-40"
        onClick={onCancel}
      />
      <div
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

        <form onSubmit={handleSubmit} className="p-3">
          <textarea
            ref={textareaRef}
            rows="3"
            className="w-full p-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Add your feedback..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="flex items-center justify-end gap-3 mt-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 active:text-gray-800"
            >
              Cancel
            </button>
            <button
              ref={submitButtonRef}
              type="button"
              disabled={!comment.trim()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg active:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
