import { useState, useRef } from "react";
import { API_URL } from "../config";
import { encodeMarkdownForUrl } from "../utils/markdownShare";
import {
  parseShareErrorResponse,
  parseShareNetworkError,
} from "../utils/shareErrors";
import { trackEvent } from "../utils/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function InputView({
  content,
  onChange,
  onStartAnnotating,
  onLoadShareCode,
  error,
}) {
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareErrorMessage, setShareErrorMessage] = useState("");
  const [shareUrlError, setShareUrlError] = useState(false);
  const [shareUrlFallback, setShareUrlFallback] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeInputError, setCodeInputError] = useState("");
  const [showShareResult, setShowShareResult] = useState(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [showHelp, setShowHelp] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("specmark_help_collapsed_v1") !== "true";
  });
  const shareErrorTimeoutRef = useRef(null);

  const setShareErrorWithTimeout = (message) => {
    setShareErrorMessage(message);
    if (shareErrorTimeoutRef.current) {
      window.clearTimeout(shareErrorTimeoutRef.current);
    }
    shareErrorTimeoutRef.current = window.setTimeout(() => {
      setShareErrorMessage("");
      shareErrorTimeoutRef.current = null;
    }, 4000);
  };

  const handleShareURL = async () => {
    if (!content.trim()) return;

    // Encode markdown as URL-safe base64 with UTF-8 support
    const encoded = encodeMarkdownForUrl(content);
    const url = `${window.location.origin}${window.location.pathname}?markdown=${encoded}`;

    try {
      await navigator.clipboard.writeText(url);
      setShareSuccess(true);
      setShareErrorMessage("");
      setShareUrlError(false);
      setShareUrlFallback("");
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      setShareUrlError(true);
      setShareUrlFallback(url);
      setShareSuccess(false);
      setTimeout(() => setShareUrlError(false), 3000);
    }
  };

  const handleGetShareCode = async () => {
    if (!content.trim()) return;

    setIsCreatingShare(true);
    setShowShareResult(null);
    try {
      const response = await fetch(`${API_URL}/api/share`, {
        method: "POST",
        headers: {
          "Content-Type": "text/markdown",
        },
        body: content,
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errorInfo = parseShareErrorResponse({
          data,
          status: response.status,
          context: "create",
        });
        throw Object.assign(new Error(errorInfo.message), {
          code: errorInfo.code,
        });
      }

      setShowShareResult(data);
      setShareErrorMessage("");
      trackEvent("Share Create");
    } catch (err) {
      console.error("Failed to create share:", err);
      const message = err?.code
        ? err.message
        : parseShareNetworkError("create").message;
      setShareErrorWithTimeout(message);
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!showShareResult) return;
    try {
      await navigator.clipboard.writeText(showShareResult.url);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyShareCode = async () => {
    if (!showShareResult) return;
    try {
      await navigator.clipboard.writeText(showShareResult.code);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleLoadCode = (e) => {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();

    if (!code) {
      setCodeInputError("Please enter a code");
      return;
    }

    // Basic validation - 6 alphanumeric characters
    if (!/^[2-9A-HJKMNP-Z]{6}$/i.test(code)) {
      setCodeInputError("Invalid code format");
      return;
    }

    setCodeInputError("");
    onLoadShareCode(code);
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Specmark Markdown Annotator
            </h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
              Paste your Markdown specification to annotate and provide feedback
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button asChild variant="outline" size="sm">
              <a href="/cli/">
                <span className="hidden sm:inline">CLI Setup</span>
                <span className="sm:hidden">CLI</span>
              </a>
            </Button>
            {/* Start Annotating - prominent on mobile */}
            <Button
              onClick={onStartAnnotating}
              disabled={!content.trim()}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (content.trim()) onStartAnnotating();
              }}
              className="touch-manipulation"
            >
              <span className="hidden sm:inline">Start Annotating</span>
              <span className="sm:hidden">Annotate</span>
            </Button>

            {/* Code entry - hidden on mobile */}
            <form
              onSubmit={handleLoadCode}
              className="hidden sm:flex items-center gap-2"
            >
              <div className="relative">
                <Input
                  type="text"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.toUpperCase());
                    setCodeInputError("");
                  }}
                  placeholder="Enter code"
                  maxLength={6}
                  className={cn(
                    "w-28 uppercase font-mono",
                    codeInputError && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {codeInputError && (
                  <p className="absolute top-full left-0 mt-1 text-xs text-destructive">
                    {codeInputError}
                  </p>
                )}
              </div>
              <Button type="submit" variant="outline" size="sm">
                Load
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Code entry - mobile */}
      <div className="sm:hidden px-4 pb-3">
        <form onSubmit={handleLoadCode} className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              type="text"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase());
                setCodeInputError("");
              }}
              placeholder="Enter share code"
              maxLength={6}
              className={cn(
                "w-full uppercase font-mono",
                codeInputError && "border-destructive focus-visible:ring-destructive",
              )}
            />
            {codeInputError && (
              <p className="mt-1 text-xs text-destructive">{codeInputError}</p>
            )}
          </div>
          <Button type="submit" variant="outline" size="sm">
            Load
          </Button>
        </form>
      </div>

      <div className="flex-1 flex flex-col p-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-sm">Quick guide</CardTitle>
              <CardDescription className="text-xs">
                Specmark helps you highlight requirements and turn them into
                structured feedback.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = !showHelp;
                setShowHelp(next);
                localStorage.setItem(
                  "specmark_help_collapsed_v1",
                  next ? "false" : "true",
                );
              }}
              className="h-7 px-2 text-xs"
            >
              {showHelp ? "Hide" : "Show"}
            </Button>
          </CardHeader>
          {showHelp && (
            <CardContent className="pt-0">
              <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="font-semibold text-foreground">1. Paste Markdown</p>
                  <p>Add your spec or PRD in the editor.</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="font-semibold text-foreground">2. Annotate</p>
                  <p>Select text to leave specific feedback.</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="font-semibold text-foreground">3. Copy Feedback</p>
                  <p>Export clean Markdown for your LLM agent.</p>
                </div>
                <div className="sm:col-span-3 text-[11px] text-muted-foreground">
                  Share codes are 6 characters and expire after 7 days.
                </div>
                <div className="sm:col-span-3 text-[11px] text-muted-foreground">
                  Prefer the terminal?{" "}
                  <a href="/cli/" className="font-medium text-primary hover:underline">
                    Set up the CLI
                  </a>{" "}
                  to create share links from the command line.
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <Badge
            variant="secondary"
            className="h-5 w-5 justify-center rounded-full px-0 font-semibold"
          >
            i
          </Badge>
          <p>
            Shares expire after 7 days. Annotations are saved locally in your
            browser (localStorage).
          </p>
        </div>

        <div className="flex-1 flex flex-col">
          <label
            htmlFor="markdown-input"
            className="text-sm font-medium text-foreground mb-2"
          >
            Markdown Content
          </label>
          <Textarea
            id="markdown-input"
            className="flex-1 w-full p-4 font-mono text-sm resize-none"
            placeholder="Paste your Markdown specification here..."
            value={content}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>

        <div className="mt-4 flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => onChange("")}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            onClick={handleShareURL}
            disabled={!content.trim()}
          >
            {shareSuccess ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                URL Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share URL
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleGetShareCode}
            disabled={!content.trim() || isCreatingShare}
          >
            {isCreatingShare ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                  />
                </svg>
                Get Share Code
              </>
            )}
          </Button>
          <div className="flex-1" />
          <Button
            onClick={onStartAnnotating}
            disabled={!content.trim()}
          >
            Start Annotating
          </Button>
        </div>

        {shareUrlFallback && (
          <div className="mt-3 w-full">
            <p
              className={cn(
                "text-xs",
                shareUrlError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {shareUrlError
                ? "Clipboard failed — copy the URL below."
                : "Copy URL:"}
            </p>
            <Input
              type="text"
              readOnly
              value={shareUrlFallback}
              onFocus={(e) => e.target.select()}
              className="mt-1 w-full font-mono text-xs"
            />
          </div>
        )}
      </div>

      {/* Share result modal */}
      <Dialog
        open={Boolean(showShareResult)}
        onOpenChange={(open) => {
          if (!open) setShowShareResult(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Code Created</DialogTitle>
          </DialogHeader>

          {showShareResult && (
            <div className="space-y-4">
              {/* Code display */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Code
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-3xl font-mono font-bold text-primary tracking-widest">
                    {showShareResult.code}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyShareCode}
                    title="Copy code"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* URL display */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  URL
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    readOnly
                    value={showShareResult.url}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyShareUrl}
                    title="Copy URL"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Expiration notice */}
              <p className="text-sm text-muted-foreground">
                Expires:{" "}
                {new Date(showShareResult.expiresAt).toLocaleDateString()} (
                {Math.ceil(
                  (new Date(showShareResult.expiresAt) - new Date()) /
                    (1000 * 60 * 60 * 24),
                )}{" "}
                days)
              </p>
            </div>
          )}

          <Button onClick={() => setShowShareResult(null)} className="mt-6 w-full">
            Done
          </Button>
        </DialogContent>
      </Dialog>

      {/* Error toast */}
      {(shareErrorMessage || error) && (
        <div className="fixed bottom-4 right-4 bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-lg shadow-lg">
          {shareErrorMessage || error}
        </div>
      )}
    </div>
  );
}
