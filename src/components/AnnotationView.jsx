import {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  forwardRef,
  useImperativeHandle,
} from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CommentDialog from "./CommentDialog";
import AnnotationList from "./AnnotationList";
import InlineComments from "./InlineComments";
import { trackEvent } from "../utils/analytics";
import { getRangeOffsets, normalizeSelectionRange } from "../utils/selection";
import { generateFeedbackText } from "../utils/feedbackExport";
import {
  wrapRangeInMarks,
  wrapOffsetsInMarks,
  wrapInSmHighlight,
  buildAnnotationRanges,
} from "../utils/highlightDom";
import { hasOverlap } from "../utils/annotationOverlap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Register the custom highlight element
if (typeof window !== "undefined" && !customElements.get("sm-highlight")) {
  class SmHighlight extends HTMLElement {
    static get observedAttributes() {
      return ["data-annotation-id", "data-has-comment"];
    }

    connectedCallback() {
      this.classList.add("sm-highlight");
      this.setAttribute("tabindex", "0");
      this.setAttribute("role", "mark");
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "data-has-comment") {
        this.classList.toggle("sm-highlight--has-comment", newValue === "true");
      }
    }
  }
  customElements.define("sm-highlight", SmHighlight);
}

const MARKDOWN_PLUGINS = [remarkGfm];
const MARKDOWN_COMPONENTS = {
  table: ({ ...props }) => (
    <div className="markdown-table">
      <table {...props} />
    </div>
  ),
};

const MarkdownContent = memo(function MarkdownContent({ content }) {
  return (
    <Markdown remarkPlugins={MARKDOWN_PLUGINS} components={MARKDOWN_COMPONENTS}>
      {content}
    </Markdown>
  );
});

const AnnotationView = forwardRef(function AnnotationView(
  {
    content,
    annotations,
    onAddAnnotation,
    onUpdateAnnotation,
    onDeleteAnnotation,
    onClearAnnotations,
    exportSettings,
    onExportSettingsChange,
  },
  ref,
) {
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [copyFallbackText, setCopyFallbackText] = useState(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setShowAnnotations(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  const [returnFocusElement, setReturnFocusElement] = useState(null);
  const [overlapToast, setOverlapToast] = useState(false);
  const highlightRefs = useRef([]);
  const contentRef = useRef(null);
  const contentWrapperRef = useRef(null);
  const selectionRangeRef = useRef(null);
  const selectionOffsetsRef = useRef(null);
  const openingDialogRef = useRef(false);
  const isPointerSelectingRef = useRef(false);
  const selectionLockedRef = useRef(false);
  const sheetStartYRef = useRef(0);
  const sheetOffsetRef = useRef(0);
  const sheetDraggingRef = useRef(false);

  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 640px)").matches;

  const handleCopyFeedback = useCallback(async () => {
    if (annotations.length === 0) return;

    const feedback = generateFeedbackText(annotations, {
      header: exportSettings.header,
      includeLineNumbers: exportSettings.includeLineNumbers,
      sourceText: contentRef.current?.textContent || "",
    });
    trackEvent("Copy All", { annotations: annotations.length });

    try {
      await navigator.clipboard.writeText(feedback);
      setCopyFallbackText(null);
      return true;
    } catch (err) {
      console.error("Failed to copy:", err);
      setCopyFallbackText(feedback);
      return false;
    }
  }, [annotations, exportSettings]);

  // Expose copyAll method via ref
  useImperativeHandle(
    ref,
    () => ({
      copyAll: handleCopyFeedback,
    }),
    [handleCopyFeedback],
  );

  // Highlight existing annotations in the content
  useEffect(() => {
    if (!contentRef.current) return;

    const container = contentRef.current;

    // Clear any existing sm-highlight elements
    container.querySelectorAll("sm-highlight").forEach((el) => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    });

    // Normalize text nodes after removing highlights
    container.normalize();

    if (annotations.length === 0) return;

    // Build ranges for all annotations (with fallback to text search)
    const ranges = buildAnnotationRanges(container, annotations);
    if (ranges.length === 0) return;

    // Sort by start position descending to avoid offset shifts during wrapping
    const sorted = [...ranges].sort((a, b) => b.start - a.start);

    sorted.forEach((range) => {
      const annotation = annotations.find((a) => a.id === range.id);
      if (annotation) {
        wrapInSmHighlight(container, annotation, range);
      }
    });
  }, [annotations, content, showCommentDialog]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return undefined;

    const handleHighlightClick = (event) => {
      const highlight = event.target.closest("sm-highlight");
      if (!highlight || !container.contains(highlight)) return;

      const annotationId = highlight.getAttribute("data-annotation-id");
      if (!annotationId) return;

      const annotation = annotations.find((item) => item.id === annotationId);
      if (!annotation) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = highlight.getBoundingClientRect();
      setReturnFocusElement(contentRef.current);
      setEditingAnnotationId(annotation.id);
      setSelectedText(annotation.selectedText);
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
        right: rect.right,
        centerY: rect.top + rect.height / 2,
      });
      setShowTooltip(false);
      setDialogKey(Date.now());
      setShowCommentDialog(true);
    };

    container.addEventListener("click", handleHighlightClick);
    return () => container.removeEventListener("click", handleHighlightClick);
  }, [annotations]);

  const clearHighlight = useCallback(() => {
    if (highlightRefs.current.length === 0) return;

    highlightRefs.current.forEach((highlight) => {
      const parent = highlight.parentNode;
      if (!parent) return;
      while (highlight.firstChild) {
        parent.insertBefore(highlight.firstChild, highlight);
      }
      parent.removeChild(highlight);
    });
    highlightRefs.current = [];
  }, []);

  const handleTooltipClick = useCallback(
    (event) => {
      if (openingDialogRef.current || showCommentDialog) return;
      // Mark that we're opening the dialog (prevents selectionchange from clearing state)
      openingDialogRef.current = true;
      setReturnFocusElement(event?.currentTarget || contentRef.current);

      // Create highlight from stored range or offsets
      if (contentRef.current) {
        clearHighlight();
        const marks = selectionOffsetsRef.current
          ? wrapOffsetsInMarks(
              contentRef.current,
              selectionOffsetsRef.current,
              "annotation-mark-active",
              { "data-active": "true" },
            )
          : selectionRangeRef.current
            ? wrapRangeInMarks(
                contentRef.current,
                selectionRangeRef.current,
                "annotation-mark-active",
                { "data-active": "true" },
              )
            : [];
        highlightRefs.current = marks;
      }

      // Clear browser selection
      window.getSelection()?.removeAllRanges();
      selectionRangeRef.current = null;

      setShowTooltip(false);
      setEditingAnnotationId(null);
      setDialogKey(Date.now());
      setShowCommentDialog(true);

      // Reset the flag after a tick
      setTimeout(() => {
        openingDialogRef.current = false;
      }, 0);
    },
    [clearHighlight, showCommentDialog],
  );

  const handleTooltipPress = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleTooltipClick(event);
    },
    [handleTooltipClick],
  );

  const applySelection = useCallback(
    (range, text, { lock, showActive } = {}) => {
      if (!range || !contentRef.current) return;

      const rect = range.getBoundingClientRect();
      selectionRangeRef.current = range.cloneRange();
      selectionOffsetsRef.current = getRangeOffsets(range, contentRef.current);

      setSelectedText(text);
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
        right: rect.right,
        centerY: rect.top + rect.height / 2,
      });
      setShowTooltip(true);
      selectionLockedRef.current = Boolean(lock);

      if (showActive) {
        clearHighlight();
        const marks = selectionOffsetsRef.current
          ? wrapOffsetsInMarks(
              contentRef.current,
              selectionOffsetsRef.current,
              "annotation-mark-active",
              { "data-active": "true" },
            )
          : wrapRangeInMarks(
              contentRef.current,
              range,
              "annotation-mark-active",
              { "data-active": "true" },
            );
        highlightRefs.current = marks;
      }
    },
    [clearHighlight],
  );

  // Listen for selection changes to show tooltip (keyboard-driven)
  useEffect(() => {
    const handleSelectionChange = () => {
      if (showCommentDialog) return;
      if (isPointerSelectingRef.current) return;

      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length > 0 && contentRef.current) {
        if (selectionLockedRef.current) return;
        try {
          const range = selection.getRangeAt(0);
          if (!contentRef.current.contains(range.commonAncestorContainer)) {
            return;
          }

          const normalizedRange = normalizeSelectionRange(
            selection,
            range,
            contentRef.current,
          );
          if (!normalizedRange) return;

          applySelection(normalizedRange, text, { lock: false });
        } catch {
          // Selection might be collapsed or invalid
        }
      } else if (
        showTooltip &&
        !openingDialogRef.current &&
        !selectionLockedRef.current
      ) {
        // Selection was cleared (but not because we're opening the dialog)
        selectionRangeRef.current = null;
        selectionOffsetsRef.current = null;
        clearHighlight();
        setShowTooltip(false);
        setSelectedText("");
        setSelectionPosition(null);
        selectionLockedRef.current = false;
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [showCommentDialog, showTooltip, applySelection, clearHighlight]);

  // Pointer-driven selection capture (mouse/touch)
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return undefined;

    const handlePointerDown = (event) => {
      if (!container.contains(event.target)) return;
      isPointerSelectingRef.current = true;
      selectionLockedRef.current = false;
    };

    const handlePointerUp = () => {
      if (!isPointerSelectingRef.current) return;
      isPointerSelectingRef.current = false;
      if (showCommentDialog) return;

      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!text || !contentRef.current) return;

      try {
        const range = selection.getRangeAt(0);
        if (!contentRef.current.contains(range.commonAncestorContainer)) {
          return;
        }

        const normalizedRange = normalizeSelectionRange(
          selection,
          range,
          contentRef.current,
        );
        if (!normalizedRange) return;

        applySelection(normalizedRange, text, { lock: true, showActive: true });
      } catch {
        // ignore
      }
    };

    container.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [showCommentDialog, applySelection]);

  const handleAddComment = (comment) => {
    if (selectedText && comment.trim()) {
      if (editingAnnotationId) {
        onUpdateAnnotation(editingAnnotationId, { comment: comment.trim() });
        clearHighlight();
        setShowCommentDialog(false);
        setSelectedText("");
        setSelectionPosition(null);
        setEditingAnnotationId(null);
        return;
      }

      // Check for overlaps before adding
      const newRange = selectionOffsetsRef.current;
      if (newRange && hasOverlap(newRange, annotations)) {
        setOverlapToast(true);
        setTimeout(() => setOverlapToast(false), 3000);
        clearHighlight();
        setShowCommentDialog(false);
        setShowTooltip(false);
        setSelectedText("");
        selectionOffsetsRef.current = null;
        setSelectionPosition(null);
        selectionLockedRef.current = false;
        return;
      }

      onAddAnnotation({
        selectedText,
        comment: comment.trim(),
        timestamp: Date.now(),
        range: selectionOffsetsRef.current,
      });
      clearHighlight();
      setShowCommentDialog(false);
      setSelectedText("");
      selectionOffsetsRef.current = null;
      setSelectionPosition(null);
      selectionLockedRef.current = false;
    }
  };

  const handleCancelComment = () => {
    clearHighlight();
    setShowCommentDialog(false);
    setShowTooltip(false);
    setSelectedText("");
    selectionOffsetsRef.current = null;
    setSelectionPosition(null);
    setEditingAnnotationId(null);
    selectionLockedRef.current = false;
  };

  const handleEditFromList = (annotation, rect, triggerElement) => {
    setReturnFocusElement(triggerElement || contentRef.current);
    setEditingAnnotationId(annotation.id);
    setSelectedText(annotation.selectedText);
    const fallbackX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const fallbackY = rect ? rect.top : window.innerHeight / 2;
    setSelectionPosition({
      x: fallbackX,
      y: fallbackY,
      right: rect?.right ?? fallbackX,
      centerY: rect ? rect.top + rect.height / 2 : fallbackY,
    });
    setShowTooltip(false);
    setDialogKey(Date.now());
    setShowCommentDialog(true);
  };

  const resetSheet = () => {
    sheetDraggingRef.current = false;
    sheetOffsetRef.current = 0;
    setSheetOffset(0);
    setIsSheetDragging(false);
  };

  const handleSheetTouchStart = (event) => {
    if (!showAnnotations) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    event.preventDefault();
    sheetStartYRef.current = touch.clientY;
    sheetDraggingRef.current = true;
    setIsSheetDragging(true);
  };

  const handleSheetTouchMove = (event) => {
    if (!sheetDraggingRef.current) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    event.preventDefault();
    const delta = Math.max(0, touch.clientY - sheetStartYRef.current);
    sheetOffsetRef.current = delta;
    setSheetOffset(delta);
  };

  const handleSheetTouchEnd = () => {
    if (!sheetDraggingRef.current) return;
    const threshold = Math.min(160, window.innerHeight * 0.25);
    if (sheetOffsetRef.current > threshold) {
      setShowAnnotations(false);
    }
    resetSheet();
  };

  const tooltipAnchor =
    !isMobile && selectionPosition && typeof window !== "undefined"
      ? {
          x: Math.max(
            16,
            Math.min(
              (selectionPosition.right ?? selectionPosition.x) + 14,
              window.innerWidth - 56,
            ),
          ),
          y: Math.max(
            16,
            Math.min((selectionPosition.y ?? 0) - 26, window.innerHeight - 56),
          ),
        }
      : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Floating toggle for annotations panel (mobile has different UI) */}
      <div className="sm:hidden fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setShowAnnotations(!showAnnotations)}
          variant={showAnnotations ? "secondary" : "default"}
          size="icon"
          className="rounded-full shadow-lg h-12 w-12"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          {annotations.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full px-0 text-[10px]"
            >
              {annotations.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div
          ref={contentWrapperRef}
          className="relative max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
        >
          <div
            ref={contentRef}
            tabIndex={-1}
            className="annotation-content bg-card text-card-foreground rounded-xl shadow-sm border border-border p-8 md:p-12 prose prose-slate max-w-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            <MarkdownContent content={content} />
          </div>
          <InlineComments
            annotations={annotations}
            contentRef={contentRef}
            wrapperRef={contentWrapperRef}
            onEditAnnotation={handleEditFromList}
            onDeleteAnnotation={onDeleteAnnotation}
            refreshKey={`${content.length}-${annotations.length}-${showCommentDialog}`}
            hidden={isMobile || !showAnnotations}
          />
        </div>
      </div>

      {showAnnotations && annotations.length > 0 && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowAnnotations(false);
              resetSheet();
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[70vh] px-3 pb-3"
            style={{
              transform: `translateY(${sheetOffset}px)`,
              transition: isSheetDragging ? "none" : "transform 200ms ease",
              overscrollBehaviorY: "contain",
            }}
            onTouchEnd={handleSheetTouchEnd}
            onTouchCancel={handleSheetTouchEnd}
          >
            <div
              className="flex items-center justify-center pt-3 pb-4"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              style={{ touchAction: "none" }}
            >
              <div className="w-12 h-2 rounded-full bg-gray-300" />
            </div>
            <AnnotationList
              annotations={annotations}
              onDeleteAnnotation={onDeleteAnnotation}
              onClearAnnotations={onClearAnnotations}
              onEditAnnotation={handleEditFromList}
              exportSettings={exportSettings}
              onExportSettingsChange={onExportSettingsChange}
              onClose={() => {
                setShowAnnotations(false);
                resetSheet();
              }}
              className="rounded-t-2xl"
              onHeaderTouchStart={handleSheetTouchStart}
              onHeaderTouchMove={handleSheetTouchMove}
            />
          </div>
        </div>
      )}

      {/* Floating tooltip button - positioned beside selection */}
      {showTooltip && selectionPosition && (
        <button
          onClick={(event) => handleTooltipClick(event)}
          onPointerDown={handleTooltipPress}
          onTouchStart={handleTooltipPress}
          onMouseDown={handleTooltipPress}
          style={{
            position: "fixed",
            left: isMobile ? "50%" : `${tooltipAnchor?.x ?? 0}px`,
            top: isMobile ? "auto" : `${tooltipAnchor?.y ?? 0}px`,
            bottom: isMobile
              ? "calc(env(safe-area-inset-bottom, 0px) + 72px)"
              : "auto",
            transform: isMobile ? "translateX(-50%)" : "none",
          }}
          className="z-50 w-10 h-10 bg-card text-foreground border border-border rounded-xl shadow-lg flex items-center justify-center transition-colors hover:bg-muted touch-manipulation select-none"
          aria-label="Add comment"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 7v6m-3-3h6"
            />
          </svg>
        </button>
      )}

      {/* Floating comment dialog */}
      {showCommentDialog && (
        <CommentDialog
          key={dialogKey}
          selectedText={selectedText}
          position={selectionPosition}
          anchor={tooltipAnchor}
          onSave={handleAddComment}
          onCancel={handleCancelComment}
          initialComment={
            annotations.find((item) => item.id === editingAnnotationId)
              ?.comment || ""
          }
          submitLabel={editingAnnotationId ? "Save" : "Add"}
          returnFocusTo={returnFocusElement}
        />
      )}

      <Dialog
        open={Boolean(copyFallbackText)}
        onOpenChange={(open) => {
          if (!open) setCopyFallbackText(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy feedback</DialogTitle>
            <DialogDescription>
              Clipboard access failed — copy manually below.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            rows={8}
            value={copyFallbackText || ""}
            onFocus={(e) => e.target.select()}
            className="w-full font-mono text-xs"
          />
        </DialogContent>
      </Dialog>

      {/* Overlap toast */}
      {overlapToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg text-sm">
          Highlights can't overlap
        </div>
      )}
    </div>
  );
});

export default AnnotationView;
