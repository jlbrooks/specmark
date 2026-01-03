import { useState } from 'react'

export default function InputView({ content, onChange, onStartAnnotating }) {
  const [shareSuccess, setShareSuccess] = useState(false)
  const [shareError, setShareError] = useState(false)

  const handleShareURL = async () => {
    if (!content.trim()) return

    // Encode markdown as base64 for cleaner URLs
    const encoded = btoa(content)
    const url = `${window.location.origin}${window.location.pathname}?markdown=${encoded}`

    try {
      await navigator.clipboard.writeText(url)
      setShareSuccess(true)
      setShareError(false)
      setTimeout(() => setShareSuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
      setShareError(true)
      setShareSuccess(false)
      setTimeout(() => setShareError(false), 3000)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Markdown Annotator</h1>
        <p className="text-sm text-gray-600 mt-1">
          Paste your Markdown specification to annotate and provide feedback
        </p>
      </header>

      <div className="flex-1 flex flex-col p-6">
        <div className="flex-1 flex flex-col">
          <label htmlFor="markdown-input" className="text-sm font-medium text-gray-700 mb-2">
            Markdown Content
          </label>
          <textarea
            id="markdown-input"
            className="flex-1 w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
            placeholder="Paste your Markdown specification here..."
            value={content}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => onChange('')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear
          </button>
          <button
            onClick={handleShareURL}
            disabled={!content.trim()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {shareSuccess ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                URL Copied!
              </>
            ) : shareError ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Failed to copy
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share URL
              </>
            )}
          </button>
          <button
            onClick={onStartAnnotating}
            disabled={!content.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Start Annotating
          </button>
        </div>
      </div>
    </div>
  )
}
