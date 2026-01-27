import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function CommentDialog({
  selectedText,
  position,
  anchor,
  onSave,
  onCancel,
  initialComment = '',
  submitLabel = 'Add',
  returnFocusTo,
}) {
  const [comment, setComment] = useState(() => initialComment)
  const textareaRef = useRef(null)
  const dialogRef = useRef(null)
  const lastSubmitRef = useRef(0)
  const submitButtonRef = useRef(null)
  const submitRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const returnTarget = returnFocusTo
    return () => {
      if (returnTarget && typeof returnTarget.focus === 'function') {
        returnTarget.focus()
      }
    }
  }, [returnFocusTo])

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

  const handleDialogKeyDown = (event) => {
    if (event.key !== 'Tab') return
    const container = dialogRef.current
    if (!container) return

    const focusable = Array.from(container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.hasAttribute('disabled'))

    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  // Calculate position - prefer above selection to avoid iOS menu
  const style = {}
  if (anchor) {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const dialogHeight = 200
    const dialogWidth = 320
    const buttonSize = 40
    const gap = 12

    let left = anchor.x + buttonSize + gap
    if (left + dialogWidth + 16 > viewportWidth) {
      left = anchor.x - gap - dialogWidth
    }
    left = Math.max(16, Math.min(left, viewportWidth - dialogWidth - 16))

    let top = anchor.y - 8
    if (top + dialogHeight + 16 > viewportHeight) {
      top = viewportHeight - dialogHeight - 16
    }
    top = Math.max(16, top)

    style.left = `${left}px`
    style.top = `${top}px`
  } else if (position) {
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
        ref={dialogRef}
        style={style}
        className="fixed z-50 w-80 bg-card text-card-foreground rounded-lg shadow-2xl border border-border overflow-hidden"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="bg-primary/10 border-b border-border px-3 py-2">
          <p className="text-xs text-primary truncate" title={selectedText}>
            "{selectedText.length > 50 ? selectedText.slice(0, 50) + '...' : selectedText}"
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-3">
          <Textarea
            ref={textareaRef}
            rows="3"
            className="text-sm resize-none"
            placeholder="Add your feedback..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="flex items-center justify-end gap-3 mt-3">
            <Button
              type="button"
              onClick={onCancel}
              variant="ghost"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              ref={submitButtonRef}
              type="button"
              disabled={!comment.trim()}
              className="touch-manipulation"
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
