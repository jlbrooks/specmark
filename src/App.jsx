import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import InputView from './components/InputView'
import AnnotationView from './components/AnnotationView'
import ShareCodeForm from './components/ShareCodeForm'
import ReviewToolbar from './components/ReviewToolbar'
import { decodeMarkdownFromUrl } from './utils/markdownShare'
import { readSessionStorage, writeSessionStorage } from './utils/sessionStorage'
import { normalizeView, updateUrlParams, getViewFromUrl } from './utils/urlState'
import { fetchSharedContent } from './services/shareApi'
import { trackEvent } from './utils/analytics'
import { Button } from '@/components/ui/button'
import SAMPLE_MARKDOWN from './sampleMarkdown'

const FEEDBACK_SETTINGS_KEY = 'markdown_annotator_feedback_settings_v1'
const DEFAULT_FEEDBACK_SETTINGS = {
  header: '## Feedback\n\nGenerated with Specmark',
  includeLineNumbers: false,
}

// Generate a simple hash for the markdown content
function hashContent(content) {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString()
}

function createAnnotationId() {
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID()
  }
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function readFeedbackSettings() {
  if (typeof window === 'undefined') return DEFAULT_FEEDBACK_SETTINGS
  try {
    const stored = localStorage.getItem(FEEDBACK_SETTINGS_KEY)
    if (!stored) return DEFAULT_FEEDBACK_SETTINGS
    const parsed = JSON.parse(stored)
    return {
      header: typeof parsed?.header === 'string' ? parsed.header : DEFAULT_FEEDBACK_SETTINGS.header,
      includeLineNumbers: Boolean(parsed?.includeLineNumbers),
    }
  } catch (err) {
    console.warn('Failed to read feedback settings:', err)
    return DEFAULT_FEEDBACK_SETTINGS
  }
}

function getInitialState() {
  if (typeof window === 'undefined') {
    return {
      markdown: SAMPLE_MARKDOWN,
      annotations: [],
      view: 'input',
      shareCode: null,
      pendingShareCode: null,
      fromSession: false,
      source: 'default',
    }
  }

  const params = new URLSearchParams(window.location.search)
  const view = normalizeView(params.get('view'))
  const code = params.get('c')

  if (code) {
    return {
      markdown: '',
      annotations: [],
      view: 'input',
      shareCode: null,
      pendingShareCode: code,
      fromSession: false,
      source: 'share',
    }
  }

  const base64Markdown = params.get('markdown')
  if (base64Markdown) {
    return {
      markdown: decodeMarkdownFromUrl(base64Markdown),
      annotations: [],
      view,
      shareCode: null,
      pendingShareCode: null,
      fromSession: false,
      source: 'url',
    }
  }

  const urlMarkdown = params.get('md')
  if (urlMarkdown) {
    return {
      markdown: urlMarkdown,
      annotations: [],
      view,
      shareCode: null,
      pendingShareCode: null,
      fromSession: false,
      source: 'url',
    }
  }

  const session = readSessionStorage()
  if (session) {
    return {
      markdown: session.markdown,
      annotations: Array.isArray(session.annotations) ? session.annotations : [],
      view: normalizeView(session.view),
      shareCode: session.shareCode || null,
      pendingShareCode: null,
      fromSession: true,
      source: 'session',
    }
  }

  return {
    markdown: SAMPLE_MARKDOWN,
    annotations: [],
    view,
    shareCode: null,
    pendingShareCode: null,
    fromSession: false,
    source: 'default',
  }
}

function App() {
  const initialState = useMemo(() => getInitialState(), [])
  const [markdownContent, setMarkdownContent] = useState(initialState.markdown)
  const [annotations, setAnnotations] = useState(initialState.annotations)
  const [currentView, setCurrentView] = useState(initialState.view) // 'input' or 'annotate'
  const [shareCode, setShareCode] = useState(initialState.shareCode) // Track if viewing shared content
  const [loading, setLoading] = useState(initialState.source === 'share')
  const [shareLoadError, setShareLoadError] = useState(null)
  const [shareLoadOrigin, setShareLoadOrigin] = useState(null)
  const [codeInput, setCodeInput] = useState('')
  const [codeInputError, setCodeInputError] = useState('')
  const [exportSettings, setExportSettings] = useState(() => readFeedbackSettings())
  const [copyPulse, setCopyPulse] = useState(0)
  const sessionRestoredRef = useRef(initialState.fromSession)
  const annotationViewRef = useRef(null)
  const topbarRef = useRef(null)

  const navigateToView = useCallback((view, { replace = false } = {}) => {
    updateUrlParams({ view }, { replace })
    setCurrentView(view)
  }, [])

  // Get the storage key - use share code if available, otherwise content hash
  const getStorageKey = (content, code) => {
    if (code) {
      return `annotations_share_${code}`
    }
    return `annotations_${hashContent(content)}`
  }

  // Fetch shared content by code
  const loadSharedContent = useCallback(async (code, { origin = 'manual' } = {}) => {
    setLoading(true)
    setShareLoadError(null)
    setShareLoadOrigin(origin)
    try {
      const result = await fetchSharedContent(code)
      setMarkdownContent(result.markdown)
      setShareCode(result.shareCode)
      setShareLoadError(null)
      setShareLoadOrigin(null)
      trackEvent('Share Load')
      navigateToView('annotate')
    } catch (err) {
      const errorInfo = { code: err.code || 'unknown', message: err.message }
      setShareLoadError(errorInfo)
      setShareCode(null)
      if (origin === 'manual') {
        const url = new URL(window.location.href)
        url.searchParams.delete('c')
        window.history.replaceState({}, '', url)
      }
    } finally {
      setLoading(false)
    }
  }, [navigateToView])

  useEffect(() => {
    if (!shareLoadError || shareLoadOrigin !== 'manual') return undefined
    const timeoutId = window.setTimeout(() => {
      setShareLoadError(null)
      setShareLoadOrigin(null)
    }, 4000)
    return () => window.clearTimeout(timeoutId)
  }, [shareLoadError, shareLoadOrigin])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (initialState.source === 'session') {
      updateUrlParams({ view: initialState.view }, { replace: true })
    } else if (!params.get('view')) {
      updateUrlParams({ view: 'input' }, { replace: true })
    }

    const code = params.get('c')
    if (code) {
      loadSharedContent(code, { origin: 'link' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const nextView = getViewFromUrl()
      setCurrentView(nextView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Load annotations from localStorage when markdown content or share code changes
  useEffect(() => {
    if (markdownContent.trim()) {
      const storageKey = getStorageKey(markdownContent, shareCode)
      const stored = localStorage.getItem(storageKey)

      if (stored) {
        try {
          setAnnotations(JSON.parse(stored))
        } catch (e) {
          console.error('Failed to parse stored annotations:', e)
          setAnnotations([])
        }
      } else if (!sessionRestoredRef.current) {
        setAnnotations([])
      }
      if (sessionRestoredRef.current) {
        sessionRestoredRef.current = false
      }
    }
  }, [markdownContent, shareCode])

  // Save annotations to localStorage whenever they change
  useEffect(() => {
    if (markdownContent.trim()) {
      const storageKey = getStorageKey(markdownContent, shareCode)
      localStorage.setItem(storageKey, JSON.stringify(annotations))
    }
  }, [annotations, markdownContent, shareCode])

  useEffect(() => {
    if (!markdownContent.trim()) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      writeSessionStorage({
        markdown: markdownContent,
        annotations,
        view: currentView,
        shareCode,
        updatedAt: Date.now()
      })
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [markdownContent, annotations, currentView, shareCode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(FEEDBACK_SETTINGS_KEY, JSON.stringify(exportSettings))
    } catch (err) {
      console.warn('Failed to save feedback settings:', err)
    }
  }, [exportSettings])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const node = topbarRef.current
    if (!node) return

    const setHeight = () => {
      const height = node.getBoundingClientRect().height
      document.documentElement.style.setProperty('--app-topbar-height', `${height}px`)
    }

    setHeight()

    let observer
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => setHeight())
      observer.observe(node)
    } else {
      window.addEventListener('resize', setHeight)
    }

    return () => {
      if (observer) {
        observer.disconnect()
      } else {
        window.removeEventListener('resize', setHeight)
      }
    }
  }, [])

  const handleAddAnnotation = (annotation) => {
    setAnnotations((prev) => [...prev, { ...annotation, id: createAnnotationId() }])
  }

  const handleCopyComments = useCallback(async () => {
    const didCopy = await annotationViewRef.current?.copyAll()
    if (didCopy) {
      setCopyPulse(Date.now())
    }
  }, [])

  const handleDeleteAnnotation = (id) => {
    setAnnotations((prev) => prev.filter((annotation) => annotation.id !== id))
  }

  const handleClearAnnotations = () => {
    if (window.confirm('Are you sure you want to clear all annotations? This cannot be undone.')) {
      setAnnotations([])
      if (markdownContent.trim()) {
        const storageKey = getStorageKey(markdownContent, shareCode)
        localStorage.removeItem(storageKey)
      }
    }
  }

  const handleLoadShareCode = (code) => {
    loadSharedContent(code, { origin: 'manual' })
    // Update URL to reflect the share code
    updateUrlParams({ c: code.toUpperCase() }, { replace: true })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared document...</p>
        </div>
      </div>
    )
  }

  // Error state (for share code errors)
  if (shareLoadError && shareLoadOrigin === 'link') {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-destructive text-5xl mb-4">!</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Could not load shared document</h1>
          <p className="text-muted-foreground mb-6">{shareLoadError.message}</p>
          <p className="text-sm text-muted-foreground mb-6">Check the 6-character code or start a fresh session.</p>
          <Button
            onClick={() => {
              setShareLoadError(null)
              setShareLoadOrigin(null)
              const url = new URL(window.location.href)
              url.searchParams.delete('c')
              window.history.replaceState({}, '', url)
            }}
          >
            Start Fresh
          </Button>
        </div>
      </div>
    )
  }

  const handleLoadCode = (e) => {
    e.preventDefault()
    const code = codeInput.trim().toUpperCase()

    if (!code) {
      setCodeInputError('Please enter a code')
      return
    }

    // Basic validation - 6 alphanumeric characters
    if (!/^[2-9A-HJKMNP-Z]{6}$/i.test(code)) {
      setCodeInputError('Invalid code format')
      return
    }

    setCodeInputError('')
    handleLoadShareCode(code)
    setCodeInput('')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div ref={topbarRef} className="fixed top-0 left-0 right-0 z-50 bg-background">
        {/* Shared Header */}
        <header className="border-b border-border px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <h1 className="text-xl font-medium text-black">Specmark</h1>

            {/* Right side: Docs, share code input, Load button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild variant="outline" size="sm">
                <a href="/docs">Docs</a>
              </Button>

              <ShareCodeForm
                value={codeInput}
                onChange={setCodeInput}
                onSubmit={handleLoadCode}
                error={codeInputError}
                onClearError={() => setCodeInputError('')}
                variant="desktop"
              />
            </div>
          </div>

          <ShareCodeForm
            value={codeInput}
            onChange={setCodeInput}
            onSubmit={handleLoadCode}
            error={codeInputError}
            onClearError={() => setCodeInputError('')}
            variant="mobile"
          />

          {codeInputError && (
            <p className="mt-1 text-xs text-destructive">{codeInputError}</p>
          )}
        </header>

        <ReviewToolbar
          currentView={currentView}
        canReview={Boolean(markdownContent.trim())}
        annotationsLength={annotations.length}
        onNavigate={navigateToView}
        onClearMarkdown={() => setMarkdownContent('')}
        onCopyComments={handleCopyComments}
        copyPulse={copyPulse}
        exportSettings={exportSettings}
        onExportSettingsChange={setExportSettings}
      />
      </div>

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ paddingTop: 'var(--app-topbar-height, 0px)' }}
      >
        {currentView === 'input' ? (
          <InputView
            content={markdownContent}
            onChange={setMarkdownContent}
          />
        ) : (
          <AnnotationView
            ref={annotationViewRef}
            content={markdownContent}
            annotations={annotations}
            onAddAnnotation={handleAddAnnotation}
            onUpdateAnnotation={(id, updates) => {
              setAnnotations((prev) => prev.map((annotation) => (
                annotation.id === id ? { ...annotation, ...updates } : annotation
              )))
            }}
            onDeleteAnnotation={handleDeleteAnnotation}
            onClearAnnotations={handleClearAnnotations}
            exportSettings={exportSettings}
            onExportSettingsChange={setExportSettings}
          />
        )}
      </div>

      {/* Error toast */}
      {shareLoadError?.message && shareLoadOrigin === 'manual' && (
        <div className="fixed bottom-4 right-4 bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-lg shadow-lg">
          {shareLoadError.message}
        </div>
      )}
    </div>
  )
}

export default App
