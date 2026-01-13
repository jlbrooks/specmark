import { Textarea } from "@/components/ui/textarea";

export default function InputView({ content, onChange }) {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6">
      {/* Filename display */}
      <div className="mb-2">
        <span className="text-sm text-muted-foreground font-mono">spec.md</span>
      </div>

      {/* Markdown editor */}
      <Textarea
        id="markdown-input"
        className="flex-1 w-full p-4 font-mono text-sm resize-none min-h-[400px]"
        placeholder="Paste your Markdown specification here..."
        value={content}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
