import { useState, useEffect } from 'react'
import InputView from './components/InputView'
import AnnotationView from './components/AnnotationView'

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
  const [markdownContent, setMarkdownContent] = useState('')
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
