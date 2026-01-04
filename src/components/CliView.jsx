export default function CliView() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Specmark CLI</h1>
            <p className="text-sm text-gray-600 mt-1 hidden sm:block">
              Create share links straight from your terminal.
            </p>
          </div>
          <a
            href="/"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:text-gray-900 hover:border-gray-300"
          >
            Back to app
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Install the CLI</h2>
              <p className="text-sm text-gray-600 mt-1">
                Download the script and add it to your PATH.
              </p>
            </div>
            <a
              href="/cli/annotate-md"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Download script
            </a>
          </div>

          <pre className="mt-4 bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">
            <code>{`mkdir -p ~/.local/bin
curl -fsSL https://specmark.dev/cli/annotate-md -o ~/.local/bin/annotate-md
chmod +x ~/.local/bin/annotate-md`}</code>
          </pre>
          <p className="mt-3 text-xs text-gray-500">
            Requirements: bash, curl, jq
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900">Usage</h3>
            <pre className="mt-3 bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">
              <code>{`annotate-md ./specs/authentication.md
# URL + code printed to stdout`}</code>
            </pre>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900">Custom API endpoint</h3>
            <pre className="mt-3 bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">
              <code>{`export ANNOTATE_API_URL=https://specmark.dev
annotate-md ./specs/authentication.md`}</code>
            </pre>
          </div>
        </div>

        <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900">What it does</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>Uploads Markdown to the Specmark share API.</li>
            <li>Returns a 6-character share code plus a share URL.</li>
            <li>Works with local or production endpoints via env vars.</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
