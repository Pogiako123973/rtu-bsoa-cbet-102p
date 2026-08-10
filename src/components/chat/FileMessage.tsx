import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  Loader2,
  ScrollText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import "highlight.js/styles/github-dark.css";
import { toast } from "sonner";
import { findLessonFileByName } from "@/lib/api";
import { cn } from "@/lib/utils";

const FILENAME_RE =
  /^[\w\-.:]+\.(txt|md|markdown|json|csv|ya?ml|xml|log|ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|c|cpp|cs|rb|php|sh|bash|sql|html|css|scss|env|ini|conf|gradle|kt|swift|dart)$/i;

/** Guess whether a message body looks like just a filename. */
export function looksLikeFilename(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t.length > 200) return false;
  // No whitespace and matches our filename regex
  if (/\s/.test(t)) return false;
  return FILENAME_RE.test(t);
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "missing" }
  | {
      kind: "ready";
      text: string;
      name: string;
      url: string;
      truncated: boolean;
    }
  | { kind: "error"; message: string };

/**
 * Render a chat message that is actually just the name of an uploaded
 * file: try to fetch the file from the `lesson-files` bucket and show
 * its contents inline (markdown / code block + toolbar).
 */
export function FileMessage({ filename }: { filename: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const found = await findLessonFileByName(filename);
        if (cancelled) return;
        if (!found) {
          setState({ kind: "missing" });
          return;
        }
        const res = await fetch(found.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (cancelled) return;
        const truncated = text.length > 60_000;
        setState({
          kind: "ready",
          text: truncated ? text.slice(0, 60_000) : text,
          name: filename,
          url: found.url,
          truncated,
        });
      } catch (e: any) {
        if (cancelled) return;
        setState({ kind: "error", message: e?.message ?? "Couldn't read file" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filename]);

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <div className="flex items-center gap-2 text-xs opacity-80">
        <Loader2 className="h-3 w-3 animate-spin" />
        Opening {filename}…
      </div>
    );
  }

  if (state.kind === "missing") {
    return (
      <div className="space-y-1">
        <p className="whitespace-pre-line">{filename}</p>
        <p className="text-[10px] opacity-60">
          File not found in storage — message kept as text.
        </p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-1">
        <p className="whitespace-pre-line">{filename}</p>
        <p className="text-[10px] opacity-60">Couldn't read file ({state.message}).</p>
      </div>
    );
  }

  const isMd = /\.md|markdown$/i.test(state.name);
  const ext = state.name.split(".").pop()?.toLowerCase() ?? "";
  const lang =
    {
      ts: "ts",
      tsx: "tsx",
      js: "js",
      json: "json",
      py: "python",
      sh: "bash",
      sql: "sql",
      yaml: "yaml",
      yml: "yaml",
      xml: "xml",
      css: "css",
      html: "xml",
    }[ext] ?? "plaintext";

  async function copy() {
    try {
      await navigator.clipboard.writeText(state.kind === "ready" ? state.text : "");
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-white/15">
      {/* header */}
      <div className="flex items-center gap-2 bg-black/25 px-2.5 py-1.5 text-[11px]">
        {isMd ? (
          <ScrollText className="h-3.5 w-3.5 opacity-80" />
        ) : (
          <FileCode2 className="h-3.5 w-3.5 opacity-80" />
        )}
        <span className="font-mono opacity-90">{state.name}</span>
        <span className="ml-1 opacity-60">·</span>
        <span className="opacity-60">
          {state.text.length.toLocaleString()} chars
        </span>
        <span className="ml-auto" />
        <button
          type="button"
          onClick={copy}
          title="Copy"
          className="rounded p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
        >
          <Copy className="h-3 w-3" />
        </button>
        <a
          href={state.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          className="rounded p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={state.url}
          download={state.name}
          title="Download"
          className="rounded p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
        >
          <Download className="h-3 w-3" />
        </a>
      </div>
      {/* body */}
      {isMd ? (
        <div className="prose-chat prose prose-invert max-w-none bg-black/30 px-4 py-3 text-[13px]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
          >
            {state.text}
          </ReactMarkdown>
        </div>
      ) : (
        <pre className="m-0 max-h-72 overflow-auto bg-[#0d1117] p-3 text-[12px] leading-relaxed text-slate-100">
          <code className={`hljs language-${lang}`}>{state.text}</code>
        </pre>
      )}
      {state.truncated && (
        <div className="bg-black/30 px-3 py-1.5 text-[10px] opacity-70">
          Showing first 60,000 chars — open or download to see the rest.
        </div>
      )}
    </div>
  );
}

/** Markdown rendered inside chat bubbles. */
export function InlineMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("prose-chat prose prose-invert max-w-none text-sm", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

export { FileText };
