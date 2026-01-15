import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CliView() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Specmark CLI</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
              Create share links straight from your terminal.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/">Back to app</a>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">What it does</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Uploads Markdown to the Specmark share API.</li>
              <li>Returns a 6-character share code plus a share URL.</li>
              <li>Works with local or production endpoints via env vars.</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
