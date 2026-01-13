import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function AnnotationList({
  annotations,
  onDeleteAnnotation,
  onClearAnnotations,
  onEditAnnotation,
  exportSettings,
  onExportSettingsChange,
  onClose,
  className = '',
  onHeaderTouchStart,
  onHeaderTouchMove,
}) {
  return (
    <div className={cn("h-full bg-card text-card-foreground rounded-xl shadow-lg border border-border overflow-hidden flex flex-col", className)}>
      <div
        className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/50"
        onTouchStart={onHeaderTouchStart}
        onTouchMove={onHeaderTouchMove}
        style={onHeaderTouchStart ? { touchAction: 'none' } : undefined}
      >
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Feedback
              <Badge variant="secondary">{annotations.length}</Badge>
            </h2>
            {onClose && (
              <span className="text-[10px] text-muted-foreground">Swipe down to close</span>
            )}
          </div>
          {onClose && (
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m0 0l-4-4m4 4l4-4" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2">
          {annotations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAnnotations}
              className="text-destructive hover:text-destructive"
              title="Clear all"
            >
              Clear
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
        {onExportSettingsChange && exportSettings && (
          <details className="rounded-lg border border-border bg-background px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
              Export settings
            </summary>
            <div className="mt-3 space-y-3">
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
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
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
          </details>
        )}
        {annotations.map((annotation) => (
          <div
            key={annotation.id}
            className="bg-muted/40 rounded-lg border border-border p-3 group hover:bg-muted/60 transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={(event) => {
              if (!onEditAnnotation) return
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
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-900 bg-amber-100/60 rounded px-2 py-1 mb-2 line-clamp-2">
                  "{annotation.selectedText}"
                </p>
                <p className="text-sm text-foreground">{annotation.comment}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation()
                  onDeleteAnnotation(annotation.id)
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>
        ))}
        </div>
      </ScrollArea>
    </div>
  )
}
