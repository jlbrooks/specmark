export default function AnnotationList({ annotations, onDeleteAnnotation, onClearAnnotations }) {
  return (
    <div className="h-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">
          Feedback ({annotations.length})
        </h2>
        {annotations.length > 0 && (
          <button
            onClick={onClearAnnotations}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
            title="Clear all"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {annotations.map((annotation) => (
          <div
            key={annotation.id}
            className="bg-gray-50 rounded-lg p-3 group hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-2 line-clamp-2">
                  "{annotation.selectedText}"
                </p>
                <p className="text-sm text-gray-700">{annotation.comment}</p>
              </div>
              <button
                onClick={() => onDeleteAnnotation(annotation.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
