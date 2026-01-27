import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Sparkles, Copy } from 'lucide-react'

export default function ReviewToolbar({
  currentView,
  canReview,
  annotationsLength,
  onNavigate,
  onClearMarkdown,
  onCopyComments,
  exportSettings,
  onExportSettingsChange,
}) {
  const [showExportSettings, setShowExportSettings] = useState(false)
  const exportPanelRef = useRef(null)

  useEffect(() => {
    if (!showExportSettings) return
    const handleClick = (event) => {
      if (!exportPanelRef.current?.contains(event.target)) {
        setShowExportSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExportSettings])

  useEffect(() => {
    if (currentView !== 'annotate') {
      setShowExportSettings(false)
    }
  }, [currentView])

  return (
    <div className="border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50 bg-background shadow-sm">
      <div className="inline-flex rounded-full border border-border p-0.5 bg-background">
        <button
          onClick={() => onNavigate('input')}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
            currentView === 'input'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Edit
        </button>
        <button
          onClick={() => canReview && onNavigate('annotate')}
          disabled={!canReview}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
            currentView === 'annotate'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Review
        </button>
      </div>

      <div className="flex items-center gap-2">
        {currentView === 'input' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearMarkdown}
            disabled={!canReview}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Clear markdown</span>
            <span className="sm:hidden">Clear</span>
          </Button>
        ) : (
          <>
            <div className="relative" ref={exportPanelRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportSettings((prev) => !prev)}
              >
                Export settings
              </Button>
              {showExportSettings && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card shadow-lg p-3 z-40">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Header / prefix
                    <Textarea
                      rows={3}
                      value={exportSettings.header}
                      onChange={(event) => onExportSettingsChange({
                        ...exportSettings,
                        header: event.target.value,
                      })}
                      className="mt-1 w-full text-xs font-mono"
                      placeholder="Add a header or context for your feedback"
                    />
                  </label>
                  <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={exportSettings.includeLineNumbers}
                      onCheckedChange={(checked) => onExportSettingsChange({
                        ...exportSettings,
                        includeLineNumbers: Boolean(checked),
                      })}
                    />
                    Include line numbers in quoted selections
                  </label>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyComments}
              disabled={annotationsLength === 0}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy comments</span>
              <span className="sm:hidden">Copy</span>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
