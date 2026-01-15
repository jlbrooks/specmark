import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DocsView() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Specmark Documentation</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
              Give precise feedback to AI agents on their Markdown output.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/">Back to app</a>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* What is Specmark */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">What is Specmark?</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Specmark helps you give precise, contextual feedback to AI agents. When an LLM generates a spec,
                design doc, or any Markdown content, paste it into Specmark to annotate specific sections with your feedback.
                Then copy the structured comments back to your AI conversation. No more vague instructions like
                "fix the third paragraph" — your feedback references the exact text.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* How to use */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Workflow</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">1. Paste Markdown</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Copy the Markdown output from your AI agent and paste it in <strong>Edit</strong> mode. Or use a share code from the CLI.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">2. Annotate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Switch to <strong>Review</strong> mode and select text to add feedback. Each annotation captures the exact text you're commenting on.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">3. Copy to AI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click <strong>Copy comments</strong> and paste the structured feedback back into your AI conversation for precise revisions.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CLI Section */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">CLI (Optional)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            For longer documents, use the CLI to upload Markdown files and get a share code you can load in the app.
          </p>

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Install the CLI</CardTitle>
                <CardDescription className="text-sm">
                  Download the script and add it to your PATH.
                </CardDescription>
              </div>
              <Button asChild>
                <a href="https://raw.githubusercontent.com/jlbrooks/specmark/main/cli/specmark">
                  Download script
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">
                <code>{`mkdir -p ~/.local/bin
curl -fsSL https://raw.githubusercontent.com/jlbrooks/specmark/main/cli/specmark -o ~/.local/bin/specmark
chmod +x ~/.local/bin/specmark`}</code>
              </pre>
              <p className="mt-3 text-xs text-muted-foreground">
                Requirements: bash, curl, jq
              </p>
            </CardContent>
          </Card>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">
                  <code>{`specmark ./specs/authentication.md
# URL + code printed to stdout`}</code>
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom API endpoint</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">
                  <code>{`export SPECMARK_API_URL=https://specmark.dev
specmark ./specs/authentication.md`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">What the CLI does</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Uploads Markdown to the Specmark share API.</li>
                <li>Returns a 6-character share code plus a share URL.</li>
                <li>Works with local or production endpoints via env vars.</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
