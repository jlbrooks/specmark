import { useState, useEffect } from 'react'
import InputView from './components/InputView'
import AnnotationView from './components/AnnotationView'
import { API_URL } from './config'
import { decodeMarkdownFromUrl } from './utils/markdownShare'

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

function App() {
  const [markdownContent, setMarkdownContent] = useState(SAMPLE_MARKDOWN)
  const [annotations, setAnnotations] = useState([])
  const [currentView, setCurrentView] = useState('input') // 'input' or 'annotate'
  const [shareCode, setShareCode] = useState(null) // Track if viewing shared content
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Get the storage key - use share code if available, otherwise content hash
  const getStorageKey = (content, code) => {
    if (code) {
      return `annotations_share_${code}`
    }
    return `annotations_${hashContent(content)}`
  }

  // Fetch shared content by code
  const fetchSharedContent = async (code) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/share/${code}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load shared content')
      }

      setMarkdownContent(data.markdown)
      setShareCode(code.toUpperCase())
      setCurrentView('annotate')
    } catch (err) {
      setError(err.message)
      setShareCode(null)
    } finally {
      setLoading(false)
    }
  }

  // Load markdown from URL query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // ?c= takes precedence (share code)
    const code = params.get('c')
    if (code) {
      fetchSharedContent(code)
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
    }
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
      } else {
        setAnnotations([])
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

  const handleStartAnnotating = () => {
    if (markdownContent.trim()) {
      setCurrentView('annotate')
    }
  }

  const handleBackToEdit = () => {
    setCurrentView('input')
    // Clear share code when going back to edit (user is now working with local content)
    if (shareCode) {
      setShareCode(null)
      // Update URL to remove the code param
      const url = new URL(window.location.href)
      url.searchParams.delete('c')
      window.history.replaceState({}, '', url)
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
    fetchSharedContent(code)
    // Update URL to reflect the share code
    const url = new URL(window.location.href)
    url.searchParams.set('c', code.toUpperCase())
    window.history.replaceState({}, '', url)
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
  if (error && !markdownContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Could not load shared document</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null)
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
          error={error}
        />
      ) : (
        <AnnotationView
          content={markdownContent}
          annotations={annotations}
          onAddAnnotation={handleAddAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onClearAnnotations={handleClearAnnotations}
          onBackToEdit={handleBackToEdit}
        />
      )}
    </div>
  )
}

export default App
