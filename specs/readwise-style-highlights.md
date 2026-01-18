# Readwise-Style Highlighting Implementation

## Overview

This spec proposes migrating specmark's highlighting system from the current CSS Highlight API + mark-based approach to a Readwise Reader-inspired inline element approach using a custom Web Component, with DOM wrapping everywhere and **no overlapping highlights**.

## Current Implementation Analysis

### How it works now

1. **Dual-mode rendering**: Uses CSS Highlight API when available, falls back to `<mark>` elements
2. **Selection flow**: `selectionchange` event → show floating "+" button → click opens comment dialog
3. **Highlight storage**: Annotations stored with text offsets (`range.start`, `range.end`)
4. **DOM manipulation**: `applyAnnotationHighlights()` wraps text in `<mark>` elements, splitting text nodes at highlight boundaries

### Current issues

- CSS Highlight API doesn't allow click handlers on highlights (requires hit-testing via `caretRangeFromPoint`)
- Table content requires special handling (fallback to marks)
- Complex offset calculation with `getTextNodesWithOffsets()`
- No resize handles for adjusting highlight boundaries
- Floating "+" button can feel disconnected from selection

## Readwise Approach Analysis

### Key findings from inspection

1. **Custom Web Component**: `<rw-highlight>` wraps highlighted text inline
   ```html
   <p>
     "text before..."
     <rw-highlight class="rw-highlight rw-highlight--has-note" data-highlight-id="...">
       <span class="rw-highlight-resize-handle rw-highlight-resize-handle--start">⁠</span>
       "highlighted text"
       <span class="rw-highlight-icon-wrapper"></span>
       <span class="rw-highlight-resize-handle rw-highlight-resize-handle--end">⁠</span>
     </rw-highlight>
     "text after..."
   </p>
   ```

2. **Styling**: `rgba(255, 213, 0, 0.15)` background on inline spans, `display: inline`

3. **Resize handles**: Word-joiner characters (`⁠` U+2060) as invisible drag anchors at start/end

4. **Toolbar**: Inline at end of selection with icons (cancel, comment, tag, more)

5. **State via classes**: `rw-highlight--has-note` modifier for different states

6. **React + Web Components hybrid**: React for UI chrome, Web Components for highlight wrapping

## Proposed Implementation

### Phase 1: Custom Element Foundation

Create `<sm-highlight>` Web Component:

```javascript
// src/components/Highlight/SmHighlight.js
class SmHighlight extends HTMLElement {
  static get observedAttributes() {
    return ['data-annotation-id', 'data-has-comment']
  }

  connectedCallback() {
    this.classList.add('sm-highlight')
    this.setAttribute('tabindex', '0')
    this.setAttribute('role', 'mark')
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'data-has-comment') {
      this.classList.toggle('sm-highlight--has-comment', newValue === 'true')
    }
  }
}

if (!customElements.get('sm-highlight')) {
  customElements.define('sm-highlight', SmHighlight)
}
```

### Phase 2: Highlight Rendering (DOM wrapping everywhere)

Replace `applyAnnotationHighlights()` with custom element insertion that does **not** use `range.surroundContents()` (which throws on multi-node selections). Use text-node walking + splitting, mirroring the current `wrapRangeInMarks()` approach.

```javascript
function renderHighlights(container, annotations) {
  // Clear existing highlights
  container.querySelectorAll('sm-highlight').forEach(el => {
    el.replaceWith(...el.childNodes)
  })
  container.normalize()

  const sorted = [...annotations]
    .filter(a => a.range?.start != null && a.range?.end != null)
    .sort((a, b) => b.range.start - a.range.start)

  sorted.forEach(annotation => {
    wrapInHighlight(container, annotation)
  })
}

function wrapInHighlight(container, annotation) {
  const range = createRangeFromOffsets(container, annotation.range.start, annotation.range.end)
  if (!range) return

  wrapRangeInHighlights(container, range, annotation)
}

function wrapRangeInHighlights(container, range, annotation) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const textNodes = []

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode)
  }

  textNodes.forEach((node) => {
    if (!rangeIntersectsNode(range, node)) return

    let startOffset = 0
    let endOffset = node.textContent.length

    if (node === range.startContainer) startOffset = range.startOffset
    if (node === range.endContainer) endOffset = range.endOffset

    if (startOffset === endOffset) return
    const segmentText = node.textContent.slice(startOffset, endOffset)
    if (segmentText.trim() === '') return

    let target = node
    if (endOffset < target.textContent.length) target.splitText(endOffset)
    if (startOffset > 0) target = target.splitText(startOffset)

    const highlight = document.createElement('sm-highlight')
    highlight.setAttribute('data-annotation-id', annotation.id)
    highlight.setAttribute('data-has-comment', annotation.comment ? 'true' : 'false')
    target.parentNode.insertBefore(highlight, target)
    highlight.appendChild(target)
  })
}
```

### Phase 2.5: Overlap Guard

Disallow overlapping highlights for now. On add, detect overlap against existing ranges and block the add with a short toast.

```javascript
function hasOverlap(nextRange, annotations) {
  return annotations.some((annotation) => {
    const start = annotation?.range?.start
    const end = annotation?.range?.end
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false
    return nextRange.start < end && nextRange.end > start
  })
}
```

### Phase 3: Inline Toolbar

Replace floating "+" button with inline toolbar at selection end:

```jsx
// src/components/Highlight/SelectionToolbar.jsx
function SelectionToolbar({ position, onHighlight, onCancel }) {
  return (
    <div
      className="sm-selection-toolbar"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
      }}
    >
      <button onClick={onCancel} aria-label="Cancel">
        <XIcon />
      </button>
      <button onClick={onHighlight} aria-label="Add comment">
        <MessageIcon />
      </button>
    </div>
  )
}
```

Toolbar positioning: Anchor to end of selection range, not center-above. Use viewport coordinates from `range.getBoundingClientRect()` so it stays aligned while scrolling.

### Phase 4: Click Handling

Direct event handling on custom element (no hit-testing needed):

```javascript
useEffect(() => {
  const handleHighlightClick = (event) => {
    const highlight = event.target.closest('sm-highlight')
    if (!highlight) return

    const annotationId = highlight.getAttribute('data-annotation-id')
    const annotation = annotations.find(a => a.id === annotationId)
    if (!annotation) return

    event.preventDefault()
    openCommentDialog(annotation, highlight.getBoundingClientRect())
  }

  container.addEventListener('click', handleHighlightClick)
  return () => container.removeEventListener('click', handleHighlightClick)
}, [annotations])
```

### Phase 5: CSS Styling

```css
/* Base highlight */
sm-highlight {
  display: inline;
  background-color: var(--highlight-saved);
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 150ms ease;
}

sm-highlight:hover,
sm-highlight:focus {
  background-color: var(--highlight-saved-hover);
  outline: none;
}

/* With comment indicator */
.sm-highlight--has-comment {
  border-bottom: 2px solid var(--highlight-border);
}

/* Active selection (not yet saved) */
.sm-highlight--active {
  background-color: var(--highlight-active);
}

/* Selection toolbar */
.sm-selection-toolbar {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: var(--popover);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.sm-selection-toolbar button {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

## Migration Path

### Step 1: Add custom element (non-breaking)
- Register `SmHighlight` component
- Keep existing rendering logic

### Step 2: Switch rendering
- Replace `<mark>` with `<sm-highlight>`
- Update click handlers
- Remove CSS Highlight API code paths
- Add overlap guard in add flow

### Step 3: Update toolbar UX
- Replace floating "+" button with inline toolbar
- Position at selection end

### Step 4: Optional - Resize handles
- Add invisible drag handles at highlight boundaries
- Allow extending/shrinking highlight range

## File Changes

| File | Changes |
|------|---------|
| `src/components/Highlight/SmHighlight.js` | New - Custom element definition |
| `src/components/Highlight/SelectionToolbar.jsx` | New - Inline toolbar component |
| `src/components/AnnotationView.jsx` | Refactor highlight rendering, remove CSS Highlight API |
| `src/index.css` | Update highlight styles for custom element |

## Trade-offs

### Advantages
- Simpler click handling (no hit-testing)
- Works consistently in tables by avoiding `surroundContents()` and wrapping text nodes directly
- Foundation for resize handles
- Better accessibility (focusable element)
- Cleaner separation of concerns

### Disadvantages
- More DOM manipulation than CSS Highlight API
- More DOM manipulation overall
- Need to manage text-node splitting and cleanup on annotation delete
- Overlaps removed (simplifies logic, reduces feature set)
- Slightly more complex cleanup on annotation delete

## Open Questions

1. **Overlap policy**: Proposed to disallow overlaps. On add, detect range overlap and block with a small toast (“Highlights can’t overlap yet”). If we want auto-merge, define exact behavior now.

2. **Selection UX**: Readwise auto-creates highlight on selection. Do we keep the explicit "click to add" step?

3. **Resize handles**: Worth implementing in v1 or defer?

## References

- [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- [Range.surroundContents()](https://developer.mozilla.org/en-US/docs/Web/API/Range/surroundContents)
