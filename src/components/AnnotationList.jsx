export default function AnnotationList({ annotations, onDeleteAnnotation, onClearAnnotations }) {
  if (annotations.length === 0) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Annotations</h2>
        <p className="text-sm text-gray-500 text-center mt-8">
          No annotations yet. Select text in the document to add feedback.
        </p>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Annotations ({annotations.length})
          </h2>
          {annotations.length > 0 && (
            <button
              onClick={onClearAnnotations}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
              title="Clear all annotations"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-4">
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-2">
                    {new Date(annotation.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                    <p className="text-sm text-gray-700 italic line-clamp-3">
                      "{annotation.selectedText}"
                    </p>
                  </div>
                  <div className="text-sm text-gray-900">
                    <p className="font-medium text-gray-700 mb-1">Feedback:</p>
                    <p>{annotation.comment}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this annotation?')) {
                      onDeleteAnnotation(annotation.id)
                    }
                  }}
                  className="ml-2 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                  title="Delete annotation"
                  aria-label="Delete annotation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
