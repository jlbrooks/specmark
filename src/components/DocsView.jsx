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
              Collect feedback on Markdown specs and documents.
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
                Specmark is a lightweight tool for collecting inline feedback on Markdown documents.
                Paste or share a spec, select text to annotate, and export comments as structured feedback.
                Perfect for design docs, RFCs, technical specifications, and any document that needs review.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* How to use */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">How to use</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">1. Add your Markdown</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  In <strong>Edit</strong> mode, paste your Markdown content or load a shared document using a 6-character share code.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">2. Review and annotate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Switch to <strong>Review</strong> mode, select any text, and add your feedback. Annotations are highlighted and saved locally.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">3. Export feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click <strong>Copy comments</strong> to export all annotations as formatted text, ready to paste into a PR, doc, or message.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">4. Share with others</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Use the CLI to upload a Markdown file and get a share code. Others can load it with the code to add their own feedback.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CLI Section */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Command Line Interface</h2>

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Install the CLI</CardTitle>
                <CardDescription className="text-sm">
                  Download the script and add it to your PATH.
                </CardDescription>
              </div>
              <Button asChild>
                <a href="https://raw.githubusercontent.com/jlbrooks/specmark/main/cli/annotate-md">
                  Download script
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">
                <code>{`mkdir -p ~/.local/bin
curl -fsSL https://raw.githubusercontent.com/jlbrooks/specmark/main/cli/annotate-md -o ~/.local/bin/annotate-md
chmod +x ~/.local/bin/annotate-md`}</code>
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
                  <code>{`annotate-md ./specs/authentication.md
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
                  <code>{`export ANNOTATE_API_URL=https://specmark.dev
annotate-md ./specs/authentication.md`}</code>
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
