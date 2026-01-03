import { useState, useEffect } from 'react'
import InputView from './components/InputView'
import AnnotationView from './components/AnnotationView'

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

function App() {
  const [markdownContent, setMarkdownContent] = useState(SAMPLE_MARKDOWN)
  const [annotations, setAnnotations] = useState([])
  const [currentView, setCurrentView] = useState('input') // 'input' or 'annotate'

  // Load markdown from URL query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlMarkdown = params.get('markdown') || params.get('md')

    if (urlMarkdown) {
      try {
        // Try to decode as base64 first
        const decoded = atob(urlMarkdown)
        setMarkdownContent(decoded)
      } catch (e) {
        // If base64 fails, use URL-decoded value
        setMarkdownContent(decodeURIComponent(urlMarkdown))
      }
    }
  }, [])

  // Load annotations from localStorage when markdown content changes
  useEffect(() => {
    if (markdownContent.trim()) {
      const contentHash = hashContent(markdownContent)
      const storageKey = `annotations_${contentHash}`
      const stored = localStorage.getItem(storageKey)
      
      if (stored) {
        try {
          setAnnotations(JSON.parse(stored))
        } catch (e) {
          console.error('Failed to parse stored annotations:', e)
        }
      } else {
        setAnnotations([])
      }
    }
  }, [markdownContent])

  // Save annotations to localStorage whenever they change
  useEffect(() => {
    if (markdownContent.trim() && annotations.length >= 0) {
      const contentHash = hashContent(markdownContent)
      const storageKey = `annotations_${contentHash}`
      localStorage.setItem(storageKey, JSON.stringify(annotations))
    }
  }, [annotations, markdownContent])

  const handleStartAnnotating = () => {
    if (markdownContent.trim()) {
      setCurrentView('annotate')
    }
  }

  const handleBackToEdit = () => {
    setCurrentView('input')
  }

  const handleAddAnnotation = (annotation) => {
    setAnnotations([...annotations, { ...annotation, id: crypto.randomUUID() }])
  }

  const handleDeleteAnnotation = (id) => {
    setAnnotations(annotations.filter(a => a.id !== id))
  }

  const handleClearAnnotations = () => {
    if (window.confirm('Are you sure you want to clear all annotations? This cannot be undone.')) {
      setAnnotations([])
      if (markdownContent.trim()) {
        const contentHash = hashContent(markdownContent)
        const storageKey = `annotations_${contentHash}`
        localStorage.removeItem(storageKey)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'input' ? (
        <InputView
          content={markdownContent}
          onChange={setMarkdownContent}
          onStartAnnotating={handleStartAnnotating}
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
