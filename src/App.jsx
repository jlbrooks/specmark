import { useState, useEffect, useCallback, useRef } from 'react'
import InputView from './components/InputView'
import AnnotationView from './components/AnnotationView'
import { API_URL } from './config'
import { decodeMarkdownFromUrl } from './utils/markdownShare'
import { parseShareErrorResponse, parseShareNetworkError } from './utils/shareErrors'
import { trackEvent } from './utils/analytics'

const SAMPLE_MARKDOWN = `# Project Specification

## Overview

This document outlines the requirements for the new **user authentication system**. The goal is to provide a secure, scalable solution that supports multiple authentication methods.

## Requirements

### Functional Requirements

1. Users must be able to register with email and password
2. Support for OAuth providers (Google, GitHub)
3. Two-factor authentication via SMS or authenticator app
4. Password reset functionality via email

### Non-Functional Requirements

- Response time under 200ms for authentication requests
- Support for 10,000 concurrent users
- 99.9% uptime SLA

## Technical Approach

We will use \`JWT tokens\` for session management with the following structure:

\`\`\`json
{
  "sub": "user-id",
  "exp": 1234567890,
  "roles": ["user", "admin"]
}
\`\`\`

## Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| Design | Architecture and API design | 2 weeks |
| Implementation | Core authentication logic | 4 weeks |
| Testing | Security audit and QA | 2 weeks |

## Open Questions

- Should we support biometric authentication?
- What is the session timeout policy?
`

const SESSION_STORAGE_KEY = 'markdown_annotator_session_v1'

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

function normalizeView(view) {
  return view === 'annotate' ? 'annotate' : 'input'
}

function readSessionStorage() {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) {
      return null
    }
    const parsed = JSON.parse(stored)
    if (!parsed?.markdown || typeof parsed.markdown !== 'string') {
      return null
    }
    return parsed
  } catch (err) {
    console.warn('Failed to read session storage:', err)
    return null
  }
}

function writeSessionStorage(payload) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn('Failed to write session storage:', err)
  }
}

function App() {
  const [markdownContent, setMarkdownContent] = useState(SAMPLE_MARKDOWN)
  const [annotations, setAnnotations] = useState([])
  const [currentView, setCurrentView] = useState('input') // 'input' or 'annotate'
  const [shareCode, setShareCode] = useState(null) // Track if viewing shared content
  const [loading, setLoading] = useState(false)
  const [shareLoadError, setShareLoadError] = useState(null)
  const [shareLoadOrigin, setShareLoadOrigin] = useState(null)
  const sessionRestoredRef = useRef(false)

  const getViewFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('view') === 'annotate' ? 'annotate' : 'input'
  }, [])

  const updateUrlParams = useCallback((updates, { replace = false } = {}) => {
    const url = new URL(window.location.href)
    Object.entries(updates).forEach(([key, value]) => {
      if (value == null || value === '') {
        url.searchParams.delete(key)
      } else {
        url.searchParams.set(key, value)
      }
    })
    if (!url.searchParams.get('view')) {
      url.searchParams.set('view', getViewFromUrl())
    }
    const nextView = url.searchParams.get('view') || 'input'
    const method = replace ? 'replaceState' : 'pushState'
    window.history[method]({ view: nextView }, '', url)
  }, [getViewFromUrl])

  const navigateToView = useCallback((view, { replace = false } = {}) => {
    updateUrlParams({ view }, { replace })
    setCurrentView(view)
  }, [updateUrlParams])

  // Get the storage key - use share code if available, otherwise content hash
  const getStorageKey = (content, code) => {
    if (code) {
      return `annotations_share_${code}`
    }
    return `annotations_${hashContent(content)}`
  }

  // Fetch shared content by code
  const fetchSharedContent = useCallback(async (code, { origin = 'manual' } = {}) => {
    setLoading(true)
    setShareLoadError(null)
    setShareLoadOrigin(origin)
    try {
      const response = await fetch(`${API_URL}/api/share/${code}`)
      let data = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        const errorInfo = parseShareErrorResponse({ data, status: response.status, context: 'load' })
        throw Object.assign(new Error(errorInfo.message), { code: errorInfo.code })
      }
      if (!data?.markdown || typeof data.markdown !== 'string') {
        throw Object.assign(new Error('Unexpected response from share service.'), { code: 'server_error' })
      }

      setMarkdownContent(data.markdown)
      setShareCode(code.toUpperCase())
      setShareLoadError(null)
      setShareLoadOrigin(null)
      trackEvent('Share Load')
      navigateToView('annotate')
    } catch (err) {
      const errorInfo = err?.code
        ? { code: err.code, message: err.message }
        : parseShareNetworkError('load')
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

  // Load markdown from URL query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.get('view')) {
      updateUrlParams({ view: 'input' }, { replace: true })
    }

    // ?c= takes precedence (share code)
    const code = params.get('c')
    if (code) {
      fetchSharedContent(code, { origin: 'link' })
      return
    }

    // Fallback to legacy base64/URL encoded markdown
    const base64Markdown = params.get('markdown')
    if (base64Markdown) {
      const decoded = decodeMarkdownFromUrl(base64Markdown)
      setMarkdownContent(decoded)
      return
    }

    const urlMarkdown = params.get('md')
    if (urlMarkdown) {
      setMarkdownContent(urlMarkdown)
      return
    }

    const session = readSessionStorage()
    if (session) {
      sessionRestoredRef.current = true
      setMarkdownContent(session.markdown)
      setAnnotations(Array.isArray(session.annotations) ? session.annotations : [])
      setShareCode(session.shareCode || null)
      const restoredView = normalizeView(session.view)
      setCurrentView(restoredView)
      updateUrlParams({ view: restoredView }, { replace: true })
    }
  }, [fetchSharedContent, updateUrlParams])

  useEffect(() => {
    const handlePopState = () => {
      const nextView = getViewFromUrl()
      setCurrentView(nextView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getViewFromUrl])

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

  const handleStartAnnotating = () => {
    if (markdownContent.trim()) {
      navigateToView('annotate')
    }
  }

  const handleBackToEdit = () => {
    navigateToView('input')
    // Clear share code when going back to edit (user is now working with local content)
    if (shareCode) {
      setShareCode(null)
      // Update URL to remove the code param
      updateUrlParams({ c: null }, { replace: true })
    }
  }

  const handleAddAnnotation = (annotation) => {
    setAnnotations((prev) => [...prev, { ...annotation, id: createAnnotationId() }])
  }

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
    fetchSharedContent(code, { origin: 'manual' })
    // Update URL to reflect the share code
    updateUrlParams({ c: code.toUpperCase() }, { replace: true })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared document...</p>
        </div>
      </div>
    )
  }

  // Error state (for share code errors)
  if (shareLoadError && shareLoadOrigin === 'link') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Could not load shared document</h1>
          <p className="text-gray-600 mb-6">{shareLoadError.message}</p>
          <p className="text-sm text-gray-500 mb-6">Check the 6-character code or start a fresh session.</p>
          <button
            onClick={() => {
              setShareLoadError(null)
              setShareLoadOrigin(null)
              const url = new URL(window.location.href)
              url.searchParams.delete('c')
              window.history.replaceState({}, '', url)
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Start Fresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'input' ? (
        <InputView
          content={markdownContent}
          onChange={setMarkdownContent}
          onStartAnnotating={handleStartAnnotating}
          onLoadShareCode={handleLoadShareCode}
          error={shareLoadError?.message}
        />
      ) : (
        <AnnotationView
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
          onBackToEdit={handleBackToEdit}
        />
      )}
    </div>
  )
}

export default App
