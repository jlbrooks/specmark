import { useEffect, useState, useCallback, useRef } from 'react'
import { hasSeenMark, markAsSeen } from '@/lib/coachMarks'
import { cn } from '@/lib/utils'

export default function CoachMark({
  id,
  children,
  position = 'bottom',
  className,
  show = true,
  autoDismissMs = 8000,
}) {
  // Compute initial visibility synchronously
  const shouldShow = show && !hasSeenMark(id)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const showTimerRef = useRef(null)

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    markAsSeen(id)
    // Wait for fade animation
    window.setTimeout(() => setVisible(false), 200)
  }, [id])

  useEffect(() => {
    if (!shouldShow) {
      return
    }
    // Small delay before showing
    showTimerRef.current = window.setTimeout(() => setVisible(true), 400)
    return () => {
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current)
    }
  }, [shouldShow])

  useEffect(() => {
    if (!visible || autoDismissMs <= 0) return
    const timer = window.setTimeout(() => {
      handleDismiss()
    }, autoDismissMs)
    return () => window.clearTimeout(timer)
  }, [visible, autoDismissMs, handleDismiss])

  if (!visible) return null

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  }

  return (
    <div
      className={cn(
        'absolute z-50 pointer-events-auto',
        'bg-blue-500 text-white text-xs font-medium',
        'px-3 py-2 rounded-lg shadow-lg',
        'transition-all duration-200',
        dismissed ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-coach-mark-in',
        positionClasses[position],
        className,
      )}
      onClick={handleDismiss}
      role="tooltip"
    >
      <span>{children}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleDismiss()
        }}
        className="ml-2 opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  )
}
