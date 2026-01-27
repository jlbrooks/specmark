import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const COMMENT_BOX_WIDTH = 240
const COMMENT_GAP = 14

function buildPositions({ annotations, contentRef, wrapperRef }) {
  if (!contentRef.current || !wrapperRef.current || typeof window === 'undefined') {
    return []
  }

  const wrapperRect = wrapperRef.current.getBoundingClientRect()
  const viewportRight = window.innerWidth - wrapperRect.left - 16
  const positions = []

  annotations.forEach((annotation) => {
    if (!annotation.comment?.trim()) return

    const highlights = contentRef.current.querySelectorAll(
      `sm-highlight[data-annotation-id="${annotation.id}"]`,
    )
    if (!highlights.length) return

    let minTop = Infinity
    let minLeft = Infinity
    let maxRight = -Infinity

    highlights.forEach((node) => {
      const rect = node.getBoundingClientRect()
      minTop = Math.min(minTop, rect.top)
      minLeft = Math.min(minLeft, rect.left)
      maxRight = Math.max(maxRight, rect.right)
    })

    if (!Number.isFinite(minTop) || !Number.isFinite(maxRight)) return

    const rightCandidate = maxRight - wrapperRect.left + COMMENT_GAP
    const leftCandidate = minLeft - wrapperRect.left - COMMENT_BOX_WIDTH - COMMENT_GAP
    let left = rightCandidate

    if (rightCandidate + COMMENT_BOX_WIDTH > viewportRight && leftCandidate >= 16) {
      left = leftCandidate
    }

    left = Math.max(16, Math.min(left, viewportRight - COMMENT_BOX_WIDTH))

    positions.push({
      id: annotation.id,
      annotation,
      left,
      top: Math.max(8, minTop - wrapperRect.top - 6),
    })
  })

  return positions.sort((a, b) => a.top - b.top)
}

export default function InlineComments({
  annotations,
  contentRef,
  wrapperRef,
  onEditAnnotation,
  onDeleteAnnotation,
  refreshKey,
  hidden = false,
}) {
  const [positions, setPositions] = useState([])

  const updatePositions = useCallback(() => {
    if (hidden) {
      setPositions([])
      return
    }
    setPositions(buildPositions({ annotations, contentRef, wrapperRef }))
  }, [annotations, contentRef, wrapperRef, hidden])

  useLayoutEffect(() => {
    if (hidden) return
    if (typeof window === 'undefined') return
    const frame = window.requestAnimationFrame(() => updatePositions())
    return () => window.cancelAnimationFrame(frame)
  }, [updatePositions, refreshKey, hidden])

  useEffect(() => {
    if (hidden) return
    if (typeof window === 'undefined') return
    const handleResize = () => updatePositions()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updatePositions, hidden])

  if (hidden || positions.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0">
      {positions.map(({ id, annotation, left, top }) => (
        <div
          key={id}
          className="pointer-events-auto absolute w-60 rounded-xl border border-border bg-card/95 shadow-sm px-3 py-2 text-sm text-foreground backdrop-blur-sm"
          style={{ left: `${left}px`, top: `${top}px` }}
          role="button"
          tabIndex={0}
          onClick={(event) => {
            if (!onEditAnnotation) return
            if (event.target.closest('button')) return
            const rect = event.currentTarget.getBoundingClientRect()
            onEditAnnotation(annotation, rect, event.currentTarget)
          }}
          onKeyDown={(event) => {
            if (!onEditAnnotation) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              const rect = event.currentTarget.getBoundingClientRect()
              onEditAnnotation(annotation, rect, event.currentTarget)
            }
          }}
        >
          <div className="flex items-start gap-2">
            <p className="flex-1 leading-relaxed">{annotation.comment}</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation()
                onDeleteAnnotation(annotation.id)
              }}
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              title="Delete"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
