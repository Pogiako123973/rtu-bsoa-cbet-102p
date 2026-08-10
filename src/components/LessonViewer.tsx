import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileType,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  ScrollText,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { Document, Page, pdfjs } from "react-pdf";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getLessonFileUrl,
  lessonAttachments,
  type Lesson,
  type LessonAttachment,
} from "@/lib/api";

// react-pdf needs a worker. We point it at the matching CDN version
// shipped with the package; this avoids bundler-specific worker copy
// configuration. The version is pinned so it can never silently drift.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/* ---------- helpers ---------- */

function humanSize(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TEXT_EXT = /\.(md|markdown|txt|csv|json|ya?ml|xml|log|ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|c|cpp|cs|rb|php|sh|bash|sql|html|css|scss|env|ini|conf|gradle|kt|swift|dart)$/i;

const OFFICE_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function pickIcon(a: LessonAttachment) {
  if (a.kind === "link") return LinkIcon;
  if (a.type.startsWith("image/")) return ImageIcon;
  if (a.type === "application/pdf") return FileText;
  if (a.type.includes("spreadsheet") || a.type.includes("excel"))
    return FileSpreadsheet;
  if (a.type.includes("presentation") || a.type.includes("word"))
    return FileType;
  if (TEXT_EXT.test(a.name)) return FileCode2;
  return FileText;
}

function kindOfFile(a: LessonAttachment): "image" | "pdf" | "text" | "office" | "other" {
  if (a.kind !== "file") return "other";
  if (a.type.startsWith("image/")) return "image";
  if (a.type === "application/pdf") return "pdf";
  if (
    a.type.startsWith("text/") ||
    a.type === "application/json" ||
    a.type === "application/xml" ||
    TEXT_EXT.test(a.name)
  )
    return "text";
  if (OFFICE_TYPES.includes(a.type)) return "office";
  return "other";
}

/* ---------- subviews ---------- */

function ImagePane({ url }: { url: string }) {
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  return (
    <div className="flex h-full flex-col">
      <ViewerToolbar>
        <ViewerIconButton
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          label="Zoom out"
        >
          <span className="text-base leading-none">−</span>
        </ViewerIconButton>
        <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <ViewerIconButton
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          label="Zoom in"
        >
          <span className="text-base leading-none">+</span>
        </ViewerIconButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ViewerToggleButton on={full} onToggle={() => setFull((f) => !f)} label="Fit height" />
      </ViewerToolbar>
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto flex max-w-fit justify-center">
          <img
            src={url}
            alt="Attachment"
            className="rounded-md border bg-white shadow-lift transition-transform"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              maxHeight: full ? "none" : "70vh",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PdfPane({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  return (
    <div className="flex h-full flex-col">
      <ViewerToolbar>
        <ViewerIconButton
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          label="Previous page"
        >
          <span className="text-base leading-none">‹</span>
        </ViewerIconButton>
        <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">
          {page} / {numPages || "—"}
        </span>
        <ViewerIconButton
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
          disabled={page >= numPages}
          label="Next page"
        >
          <span className="text-base leading-none">›</span>
        </ViewerIconButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ViewerIconButton
          onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
          label="Zoom out"
        >
          <span className="text-base leading-none">−</span>
        </ViewerIconButton>
        <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <ViewerIconButton
          onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
          label="Zoom in"
        >
          <span className="text-base leading-none">+</span>
        </ViewerIconButton>
      </ViewerToolbar>
      <div className="flex-1 overflow-auto bg-muted/30 p-6">
        <div className="mx-auto flex max-w-fit justify-center">
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="flex items-center gap-2 p-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading PDF…
              </div>
            }
            error={
              <div className="p-10 text-destructive">
                Failed to render PDF.
              </div>
            }
          >
            <Page
              pageNumber={page}
              scale={scale}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="shadow-lift"
            />
          </Document>
        </div>
      </div>
    </div>
  );
}

function MarkdownPane({ text }: { text: string }) {
  return (
    <div className="prose-viewer prose prose-slate h-full max-w-none overflow-auto bg-background/40 px-8 py-6 dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { ignoreMissing: true }],
          [rehypeKatex, { throwOnError: false }],
        ]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function CodePane({ text, name }: { text: string; name?: string }) {
  const ext = name?.split(".").pop()?.toLowerCase() ?? "";
  const lang =
    {
      ts: "ts",
      tsx: "tsx",
      js: "js",
      jsx: "jsx",
      py: "python",
      rb: "ruby",
      rs: "rust",
      go: "go",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      php: "php",
      sh: "bash",
      sql: "sql",
      json: "json",
      yaml: "yaml",
      yml: "yaml",
      xml: "xml",
      html: "xml",
      css: "css",
      scss: "scss",
      md: "markdown",
      markdown: "markdown",
      csv: "plaintext",
      log: "plaintext",
      env: "plaintext",
    }[ext] ?? "plaintext";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy");
    }
  }
  return (
    <div className="flex h-full flex-col">
      <ViewerToolbar>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {lang}
        </Badge>
        <span className="ml-auto" />
        <ViewerIconButton onClick={copy} label="Copy">
          <Copy className="h-3.5 w-3.5" />
        </ViewerIconButton>
      </ViewerToolbar>
      <div className="flex-1 overflow-auto bg-[#0d1117] p-4 text-[13px] leading-relaxed text-slate-100">
        <pre className="hljs m-0 whitespace-pre">
          <code className={`language-${lang}`}>{text}</code>
        </pre>
      </div>
    </div>
  );
}

function LinkPane({ attachment }: { attachment: Extract<LessonAttachment, { kind: "link" }> }) {
  let host = "";
  try {
    host = new URL(attachment.url).hostname;
  } catch {
    host = attachment.url;
  }
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-lg border bg-card p-8 text-center shadow-soft">
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-emerald-300/20 ring-1 ring-white/15">
          <LinkIcon className="h-6 w-6 text-foreground" />
        </div>
        <h3 className="font-display text-base">{attachment.name}</h3>
        <p className="break-all text-xs text-muted-foreground">{attachment.url}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{host}</p>
        <div className="flex gap-2">
          <Button asChild>
            <a href={attachment.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Open link
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function FallbackPane({
  url,
  name,
  size,
  type,
  reason,
}: {
  url: string | null;
  name?: string;
  size?: number;
  type?: string;
  reason: string;
}) {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-lg border bg-card p-8 text-center shadow-soft">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <h3 className="font-display text-base">{name ?? "Attachment"}</h3>
        <p className="text-sm text-muted-foreground">{reason}</p>
        {size != null && (
          <p className="text-xs text-muted-foreground">{humanSize(size)}</p>
        )}
        <Button asChild disabled={!url}>
          <a
            href={url ?? "#"}
            download={name ?? true}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="mr-2 h-4 w-4" /> Download
          </a>
        </Button>
        {type && (
          <Badge variant="secondary" className="text-[10px]">
            {type}
          </Badge>
        )}
      </div>
    </div>
  );
}

/* ---------- small toolbar bits ---------- */

function ViewerToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-border/40 bg-background/60 px-3 py-1.5 backdrop-blur">
      {children}
    </div>
  );
}

function ViewerIconButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition",
        "hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function ViewerToggleButton({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={on}
      className={cn(
        "inline-flex h-7 items-center rounded-md px-2 text-xs font-medium transition",
        on
          ? "bg-foreground/10 text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Eye className="mr-1 h-3 w-3" /> {label}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
        active
          ? "bg-foreground/10 text-foreground shadow-sm ring-1 ring-foreground/10"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full items-center justify-center p-10 text-center">
      <div className="max-w-xs space-y-1">
        <p className="font-display text-base text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

type Tab = "notes" | "file";
type FileTab = "preview" | "raw";

export function LessonViewer({
  lesson,
  open,
  onOpenChange,
}: {
  lesson: Lesson | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const atts = useMemo(
    () => (lesson ? lessonAttachments(lesson) : []),
    [lesson],
  );
  const fileAtts = atts.filter(
    (a): a is Extract<LessonAttachment, { kind: "file" }> => a.kind === "file",
  );
  const linkAtts = atts.filter(
    (a): a is Extract<LessonAttachment, { kind: "link" }> => a.kind === "link",
  );

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [tab, setTab] = useState<Tab>(
    lesson?.content?.trim() ? "notes" : "file",
  );
  const [fileTab, setFileTab] = useState<FileTab>("preview");

  // Per-attachment URL cache. We don't blow it away when switching;
  // re-opening a previously viewed attachment reuses the signed URL.
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlErr, setUrlErr] = useState<string | null>(null);

  // Per-attachment text body cache.
  const [textBodies, setTextBodies] = useState<Record<string, string>>({});
  const [textErrs, setTextErrs] = useState<Record<string, string>>({});

  const hasNotes = !!lesson?.content?.trim();
  const selected = atts[selectedIdx];
  const selectedFile =
    selected?.kind === "file" ? selected : undefined;
  const selectedUrl = selectedFile ? urls[selectedFile.path] ?? null : null;
  const selectedKind = selectedFile ? kindOfFile(selectedFile) : "other";
  const selectedText = selectedFile ? textBodies[selectedFile.path] ?? null : null;
  const selectedTextErr = selectedFile ? textErrs[selectedFile.path] ?? null : null;
  const SelectedIcon = selected ? pickIcon(selected) : FileText;

  // Reset when opening a new lesson
  useEffect(() => {
    if (!open || !lesson) return;
    setUrls({});
    setUrlErr(null);
    setTextBodies({});
    setTextErrs({});
    setSelectedIdx(0);
    setTab(lesson.content?.trim() ? "notes" : "file");
    setFileTab("preview");
  }, [open, lesson?.id]);

  // Get the signed URL for the currently selected file
  useEffect(() => {
    if (!open || !selectedFile) return;
    if (urls[selectedFile.path] || urlErr) return;
    let cancelled = false;
    setUrlLoading(true);
    setUrlErr(null);
    (async () => {
      try {
        const u = await getLessonFileUrl(selectedFile.path);
        if (!cancelled) {
          setUrls((prev) => ({ ...prev, [selectedFile.path]: u }));
        }
      } catch (e: any) {
        if (!cancelled) setUrlErr(e.message);
      } finally {
        if (!cancelled) setUrlLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedFile?.path]);

  // Fetch text body when preview/raw needs it
  useEffect(() => {
    if (!open || !selectedFile || !selectedUrl) return;
    if (selectedKind !== "text") return;
    if (tab !== "file") return;
    if (textBodies[selectedFile.path] != null) return;
    if (textErrs[selectedFile.path] != null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(selectedUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const t = await res.text();
        if (!cancelled) {
          const trimmed = t.length > 200_000 ? t.slice(0, 200_000) : t;
          setTextBodies((prev) => ({ ...prev, [selectedFile.path]: trimmed }));
        }
      } catch (e: any) {
        if (!cancelled) {
          setTextErrs((prev) => ({
            ...prev,
            [selectedFile.path]: e.message,
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedFile?.path, selectedUrl, selectedKind, tab]);

  async function copyNotes() {
    if (!lesson?.content) return;
    try {
      await navigator.clipboard.writeText(lesson.content);
      toast.success("Notes copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  const showSidebar = atts.length > 0 || linkAtts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "left-1/2 top-1/2 max-w-[min(96vw,1180px)] -translate-x-1/2 -translate-y-1/2",
          "flex flex-col gap-0 overflow-hidden p-0",
          "h-[min(92vh,860px)] w-[min(96vw,1180px)]",
          "border-0 bg-transparent shadow-none sm:rounded-2xl",
          "[&>button.absolute]:hidden",
        )}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-lift">
          {/* ── header ─────────────────────────────────────────────── */}
          <header
            className={cn(
              "relative shrink-0 overflow-hidden border-b",
              "bg-gradient-to-br from-card via-card to-card/80",
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(circle at 20% 0%, oklch(0.85 0.12 200 / 0.18), transparent 55%), radial-gradient(circle at 90% 110%, oklch(0.85 0.12 165 / 0.18), transparent 55%)",
              }}
            />
            <div className="relative flex items-start gap-4 px-6 py-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-emerald-300/20 ring-1 ring-white/15">
                <SelectedIcon className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate font-display text-lg leading-tight">
                  {lesson?.title ?? "Lesson"}
                </DialogTitle>
                {/*
                  DialogDescription renders a <p> by default. We were
                  putting a Badge (a <div>) inside it, which is invalid
                  HTML (div can't be a descendant of p) and triggers
                  React's validateDOMNesting warning. `asChild` makes
                  Radix render our own wrapping <div> instead of its
                  default <p>, so the Badge nests legally.
                */}
                <DialogDescription asChild>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    {lesson && (
                      <>
                        <Badge variant="secondary">{lesson.subject}</Badge>
                        <span className="text-muted-foreground">
                          {new Date(lesson.created_at).toLocaleDateString()}
                        </span>
                        {atts.length > 0 && (
                          <>
                            <span className="text-border">•</span>
                            <span className="text-muted-foreground">
                              {fileAtts.length} {fileAtts.length === 1 ? "file" : "files"}
                              {linkAtts.length > 0 &&
                                ` · ${linkAtts.length} ${linkAtts.length === 1 ? "link" : "links"}`}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {selectedFile && selectedUrl && (
                  <>
                    <Button asChild size="sm" variant="ghost" className="h-8">
                      <a
                        href={selectedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button asChild size="sm" className="h-8">
                      <a
                        href={selectedUrl}
                        download={selectedFile.name}
                        title="Download"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* ── tabs ─────────────────────────────────────────────── */}
            {(hasNotes || atts.length > 0) && (
              <div className="relative flex items-center gap-1 border-t border-border/40 bg-background/30 px-3 py-2 backdrop-blur">
                {hasNotes && (
                  <TabButton
                    active={tab === "notes"}
                    onClick={() => setTab("notes")}
                    icon={<ScrollText className="h-3.5 w-3.5" />}
                  >
                    Notes
                  </TabButton>
                )}
                {atts.length > 0 && (
                  <TabButton
                    active={tab === "file"}
                    onClick={() => setTab("file")}
                    icon={<FileText className="h-3.5 w-3.5" />}
                  >
                    Files & Links
                  </TabButton>
                )}
                {hasNotes && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-xs"
                    onClick={copyNotes}
                    title="Copy notes"
                  >
                    <Copy className="mr-1.5 h-3 w-3" />
                    Copy notes
                  </Button>
                )}
              </div>
            )}
          </header>

          {/* ── body ─────────────────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">
            {/* sidebar with attachments */}
            {showSidebar && tab === "file" && (
              <aside className="hidden w-64 shrink-0 border-r border-border/40 bg-background/40 sm:flex sm:flex-col">
                <div className="flex-1 overflow-y-auto p-2">
                  {fileAtts.length > 0 && (
                    <div className="mb-2">
                      <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Files ({fileAtts.length})
                      </p>
                      <div className="space-y-1">
                        {fileAtts.map((a) => {
                          const idx = atts.findIndex(
                            (x) => x === a,
                          );
                          const Icon = pickIcon(a);
                          const active = selectedIdx === idx;
                          return (
                            <button
                              key={a.path}
                              type="button"
                              onClick={() => {
                                setSelectedIdx(idx);
                                setFileTab("preview");
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                                active
                                  ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                              )}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{a.name}</span>
                              {a.kind === "file" && (
                                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                                  {humanSize(a.size)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {linkAtts.length > 0 && (
                    <div>
                      <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Links ({linkAtts.length})
                      </p>
                      <div className="space-y-1">
                        {linkAtts.map((a) => {
                          const idx = atts.findIndex((x) => x === a);
                          const active = selectedIdx === idx;
                          return (
                            <button
                              key={a.url}
                              type="button"
                              onClick={() => setSelectedIdx(idx)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                                active
                                  ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                              )}
                            >
                              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{a.name}</span>
                              <ExternalLink className="ml-auto h-3 w-3 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            )}

            {/* main content */}
            <div className="flex-1 overflow-hidden bg-background/40">
              {!lesson ? null : tab === "notes" ? (
                hasNotes ? (
                  <MarkdownPane text={lesson.content} />
                ) : (
                  <EmptyState
                    title="No notes"
                    hint="This lesson doesn't have any written notes."
                  />
                )
              ) : tab === "file" ? (
                !selected ? (
                  <EmptyState
                    title="No attachments"
                    hint="This lesson has no files or links."
                  />
                ) : selected.kind === "link" ? (
                  <LinkPane attachment={selected} />
                ) : (
                  <FileViewer
                    attachment={selected}
                    url={selectedUrl}
                    loading={urlLoading}
                    err={urlErr}
                    textBody={selectedText}
                    textErr={selectedTextErr}
                    fileTab={fileTab}
                    onSetFileTab={setFileTab}
                  />
                )
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- file viewer (split from main component for hooks) ---------- */

function FileViewer({
  attachment,
  url,
  loading,
  err,
  textBody,
  textErr,
  fileTab,
  onSetFileTab,
}: {
  attachment: Extract<LessonAttachment, { kind: "file" }>;
  url: string | null;
  loading: boolean;
  err: string | null;
  textBody: string | null;
  textErr: string | null;
  fileTab: FileTab;
  onSetFileTab: (t: FileTab) => void;
}) {
  const kind = kindOfFile(attachment);
  const isText = kind === "text";

  return (
    <div className="flex h-full flex-col">
      {/* sub-tabs (preview / raw) for text files */}
      {isText && (
        <div className="flex items-center gap-1 border-b border-border/40 bg-background/30 px-3 py-2">
          <TabButton
            active={fileTab === "preview"}
            onClick={() => onSetFileTab("preview")}
            icon={<Eye className="h-3.5 w-3.5" />}
          >
            Preview
          </TabButton>
          <TabButton
            active={fileTab === "raw"}
            onClick={() => onSetFileTab("raw")}
            icon={<FileCode2 className="h-3.5 w-3.5" />}
          >
            Raw
          </TabButton>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {humanSize(attachment.size)}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing viewer…
          </div>
        ) : err || !url ? (
          <FallbackPane
            url={url}
            name={attachment.name}
            size={attachment.size}
            type={attachment.type}
            reason={`Couldn't load the file (${err ?? "no URL"}).`}
          />
        ) : kind === "image" ? (
          <ImagePane url={url} />
        ) : kind === "pdf" ? (
          <PdfPane url={url} />
        ) : kind === "text" ? (
          textBody == null ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {textErr ? `Couldn't read file (${textErr})` : "Loading text…"}
            </div>
          ) : fileTab === "raw" ? (
            <CodePane text={textBody} name={attachment.name} />
          ) : (
            <MarkdownPane text={textBody} />
          )
        ) : kind === "office" ? (
          <FallbackPane
            url={url}
            name={attachment.name}
            size={attachment.size}
            type={attachment.type}
            reason="Office documents can't be rendered in-app. Download to view."
          />
        ) : (
          <FallbackPane
            url={url}
            name={attachment.name}
            size={attachment.size}
            type={attachment.type}
            reason="This file type can't be previewed in-app."
          />
        )}
      </div>
    </div>
  );
}