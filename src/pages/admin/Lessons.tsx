import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  createLesson,
  deleteLesson,
  deleteLessonFile,
  fetchAttachmentText,
  listLessons,
  lessonAttachments,
  uploadLessonFile,
  type Lesson,
  type LessonAttachment,
} from "@/lib/api";
import { LessonViewer } from "@/components/LessonViewer";
import { LessonCard } from "@/components/LessonCard";
import { cn } from "@/lib/utils";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file

// File types we can read as plain text in the browser. Used both for
// preview rendering and for indexing file contents into full-text search.
const TEXT_MIME = [
  /^text\//,
  /application\/(json|xml|ld\+json|yaml|x-yaml|plain)$/,
];
const TEXT_EXT =
  /\.(md|markdown|txt|csv|json|ya?ml|xml|log|ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|c|cpp|h|hpp|cs|rb|php|sh|bash|sql|html|htm|css|scss|sass|less|env|ini|conf|gradle|kt|swift|dart|toml|lock)$/i;

function isTextLike(f: File): boolean {
  if (TEXT_MIME.some((rx) => rx.test(f.type))) return true;
  return TEXT_EXT.test(f.name);
}

async function readTextIfPossible(file: File): Promise<string | null> {
  if (file.size > 1.5 * 1024 * 1024) return null; // 1.5MB safety cap
  if (!isTextLike(file)) return null;
  try {
    const t = await file.text();
    return t.length > 200_000 ? t.slice(0, 200_000) : t;
  } catch {
    return null;
  }
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type PendingFile = { id: string; file: File };
type PendingLink = { id: string; name: string; url: string };

export default function AdminLessons() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  // Unfiltered list. We snapshot this on initial load + after any new
  // lesson so that when the user clears the search box we can restore
  // the full set instead of hitting the network again.
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Lesson | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [links, setLinks] = useState<PendingLink[]>([]);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text pulled from storage for attachments whose `attachment_texts`
  // entry is missing (legacy uploads, or uploads where extraction
  // failed/was skipped). Keyed by attachment path. This is what makes
  // search reach *inside* files that weren't indexed at upload time.
  const [extraTexts, setExtraTexts] = useState<Record<string, string>>({});
  const fetchingPathsRef = useRef<Set<string>>(new Set());

  function refresh() {
    setLoading(true);
    listLessons()
      .then((rows) => {
        setAllLessons(rows);
        setLessons(rows);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  // Backfill search text for file attachments that don't have an entry
  // in `attachment_texts` yet (e.g. lessons uploaded before text
  // extraction existed, or files where extraction was skipped). Runs
  // in the background so it never blocks the initial list render;
  // matches simply appear once a fetch resolves.
  useEffect(() => {
    const todo: { path: string; name: string; type: string }[] = [];
    for (const l of allLessons) {
      for (const a of l.attachments ?? []) {
        if (a.kind !== "file") continue;
        if (l.attachment_texts?.[a.path]) continue; // already indexed
        if (extraTexts[a.path] !== undefined) continue; // already fetched
        if (fetchingPathsRef.current.has(a.path)) continue; // in flight
        todo.push({ path: a.path, name: a.name, type: a.type });
      }
    }
    if (todo.length === 0) return;

    // eslint-disable-next-line no-console
    console.log(
      `[lessons] backfilling search text for ${todo.length} attachment(s):`,
      todo.map((a) => a.name),
    );
    todo.forEach((a) => fetchingPathsRef.current.add(a.path));
    Promise.allSettled(
      todo.map(async (a) => {
        const text = await fetchAttachmentText(a.path, a.name, a.type);
        // eslint-disable-next-line no-console
        console.log(
          `[lessons] backfill result for "${a.name}":`,
          text ? `${text.length} chars` : "failed / empty",
        );
        setExtraTexts((prev) => ({ ...prev, [a.path]: text ?? "" }));
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLessons]);

  function resetForm() {
    setTitle("");
    setSubject("");
    setContent("");
    setFiles([]);
    setLinks([]);
    setLinkName("");
    setLinkUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addFiles(picked: FileList | null) {
    if (!picked || picked.length === 0) return;
    const next: PendingFile[] = [];
    for (const f of Array.from(picked)) {
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" is too large (max ${humanSize(MAX_BYTES)}).`);
        continue;
      }
      next.push({ id: crypto.randomUUID(), file: f });
    }
    setFiles((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((p) => p.id !== id));
  }

  function addLink() {
    const n = linkName.trim();
    const u = linkUrl.trim();
    if (!u) {
      toast.error("Link URL is required");
      return;
    }
    let final = u;
    if (!/^https?:\/\//i.test(final)) final = "https://" + final;
    try {
      new URL(final);
    } catch {
      toast.error("Invalid URL");
      return;
    }
    setLinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: n || final, url: final },
    ]);
    setLinkName("");
    setLinkUrl("");
  }

  function removeLink(id: string) {
    setLinks((prev) => prev.filter((p) => p.id !== id));
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (p) => {
          try {
            const a = await uploadLessonFile(p.file);
            return { meta: a, body: await readTextIfPossible(p.file) };
          } catch (err: any) {
            throw new Error(`"${p.file.name}": ${err.message}`);
          }
        }),
      );
      const attachmentList: LessonAttachment[] = uploaded.map(
        ({ meta }) => ({
          kind: "file",
          path: meta.path,
          name: meta.name,
          type: meta.type,
          size: meta.size,
        }),
      );
      const attachment_texts: Record<string, string> = {};
      for (const { meta, body } of uploaded) {
        if (body) attachment_texts[meta.path] = body;
      }
      // Also flatten link metadata into the search corpus so links can be
      // matched by their label or URL.
      for (const l of links) {
        attachment_texts[`link:${l.url}`] = `${l.name} ${l.url}`;
      }
      attachmentList.push(
        ...links.map<LessonAttachment>((l) => ({
          kind: "link",
          url: l.url,
          name: l.name,
        })),
      );
      await createLesson({
        title: title.trim(),
        subject: subject.trim(),
        content: content.trim(),
        created_by: user.id,
        attachments: attachmentList,
        attachment_texts,
      });
      toast.success("Lesson published");
      resetForm();
      setOpen(false);
      setQuery("");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(l: Lesson) {
    if (!confirm(`Delete "${l.title}"?`)) return;
    try {
      await deleteLesson(l.id);
      const atts = lessonAttachments(l);
      await Promise.allSettled(
        atts
          .filter((a) => a.kind === "file")
          .map((a) => deleteLessonFile((a as any).path)),
      );
      setLessons((prev) => prev.filter((x) => x.id !== l.id));
      setAllLessons((prev) => prev.filter((x) => x.id !== l.id));
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const totalAttachments = files.length + links.length;

  const subjects = useMemo(() => {
    const set = new Set<string>();
    allLessons.forEach((l) => set.add(l.subject));
    return Array.from(set).sort();
  }, [allLessons]);

  // Search runs entirely on the loaded list. We search across title,
  // subject, notes, attachment display names, link labels/URLs, AND
  // anything we extracted to attachment_texts at upload time (which is
  // how text inside .txt/.md/.csv/.json/... files becomes searchable).
  //
  // We also support a few websearch-style helpers:
  //   - "quoted phrase"   matches the exact phrase
  //   - word1 word2 ...    matches every word, anywhere
  //   - foo -bar           excludes lessons containing "bar"
  const visible = useMemo(() => {
    const trimmed = query.trim();

    let pool = allLessons;
    if (subjectFilter !== "all") {
      pool = pool.filter((l) => l.subject === subjectFilter);
    }

    if (!trimmed) return pool;

    // Pull out "-foo" terms and quoted phrases.
    const tokens: string[] = [];
    const excludes: string[] = [];
    const phraseRegex = /"([^"]+)"/g;
    const cleaned = trimmed.replace(phraseRegex, (_, phrase) => {
      tokens.push(phrase.toLowerCase());
      return "";
    });
    for (const raw of cleaned.split(/\s+/)) {
      const w = raw.toLowerCase().trim();
      if (!w) continue;
      if (w.startsWith("-")) excludes.push(w.slice(1));
      else tokens.push(w);
    }

    const attachText = (l: Lesson): string => {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(l.attachment_texts ?? {})) {
        parts.push(k, v);
      }
      for (const a of l.attachments ?? []) {
        parts.push(a.name);
        if (a.kind === "link") parts.push(a.url);
        if (a.kind === "file" && extraTexts[a.path]) {
          parts.push(extraTexts[a.path]);
        }
      }
      return parts.join(" ").toLowerCase();
    };

    const haystack = (l: Lesson) =>
      [
        l.title,
        l.subject,
        l.content,
        attachText(l),
      ]
        .join(" ")
        .toLowerCase();

    const ranked = pool
      .map((l) => {
        const h = haystack(l);
        if (excludes.some((x) => h.includes(x))) return null;
        if (tokens.length === 0) return { l, score: 0 };
        let score = 0;
        for (const t of tokens) {
          if (h.includes(t)) score += t.length;
          else return null; // required token missing
        }
        return { l, score };
      })
      .filter((x): x is { l: Lesson; score: number } => x !== null)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.l.created_at.localeCompare(a.l.created_at);
      })
      .map((x) => x.l);

    return ranked;
  }, [allLessons, query, subjectFilter, extraTexts]);

  return (
    <div>
      <PageHeader
        title="Lessons"
        description="Publish reading material. Attach multiple PDFs, images, docs, or web links."
        action={
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New lesson
              </Button>
            </DialogTrigger>
            {/* Scrollable dialog: cap the height at 90vh and let the form scroll.
                Previously the form grew past the viewport and the user couldn't
                scroll, so title/subject/notes/files got pushed off-screen. */}
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New lesson</DialogTitle>
                <DialogDescription>
                  Add notes, attach multiple files, or paste web links — students
                  can preview, download, or open each one.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="t">Title</Label>
                    <Input
                      id="t"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder=" "
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s">Subject</Label>
                    <Input
                      id="s"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder=" "
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="c">Notes</Label>
                  <Textarea
                    id="c"
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write the lesson content here. Students see this first when they open the lesson."
                  />
                </div>

                {/* Files section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Files</Label>
                    <span className="text-[10px] text-muted-foreground">
                      {files.length} {files.length === 1 ? "file" : "files"} —
                      max {humanSize(MAX_BYTES)} each
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {files.map((p) => (
                      <PendingFileRow
                        key={p.id}
                        pending={p}
                        onRemove={() => removeFile(p.id)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground transition",
                        "hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Upload className="h-4 w-4" />
                      Click to add files (PDF, image, doc, txt…)
                    </button>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.c,.cpp,.cs,.rb,.php,.sh,.yaml,.yml"
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>

                {/* Links section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Web links</Label>
                    <span className="text-[10px] text-muted-foreground">
                      {links.length} {links.length === 1 ? "link" : "links"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {links.map((l) => (
                      <PendingLinkRow
                        key={l.id}
                        pending={l}
                        onRemove={() => removeLink(l.id)}
                      />
                    ))}
                    <div className="flex flex-col gap-2 rounded-md border border-dashed p-3 sm:flex-row">
                      <Input
                        value={linkName}
                        onChange={(e) => setLinkName(e.target.value)}
                        placeholder="Display name (optional)"
                        className="h-9"
                      />
                      <Input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com/article"
                        className="h-9"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addLink();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={addLink}
                        className="h-9 shrink-0"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add link
                      </Button>
                    </div>
                  </div>
                </div>

                {totalAttachments > 0 && (
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {files.length > 0 && (
                      <span>
                        {files.length} {files.length === 1 ? "file" : "files"}
                      </span>
                    )}
                    {files.length > 0 && links.length > 0 && " • "}
                    {links.length > 0 && (
                      <span>
                        {links.length} {links.length === 1 ? "link" : "links"}
                      </span>
                    )}
                    {" will be attached to this lesson."}
                  </div>
                )}

                <DialogFooter>
                  <Button type="submit" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publish lesson
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search & filter bar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons, content, attachment names, even text inside attached files…"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              title="Clear search"
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {subjects.length > 0 && (
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {query.trim() && (
        <p className="mb-3 text-xs text-muted-foreground">
          {searchLoading ? (
            <>
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              Searching…
            </>
          ) : (
            <>
              {visible.length} {visible.length === 1 ? "lesson" : "lessons"}{" "}
              match "{query.trim()}"
            </>
          )}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {query.trim() ? (
              <>
                No lessons match <strong>"{query.trim()}"</strong>
                {subjectFilter !== "all" && (
                  <> in {subjectFilter}</>
                )}
                .
              </>
            ) : (
              <>
                No lessons yet — click <em>New lesson</em> to add one.
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((l) => (
            <LessonCard
              key={l.id}
              lesson={l}
              onView={() => setViewing(l)}
              onDelete={() => onDelete(l)}
            />
          ))}
        </div>
      )}

      <LessonViewer
        lesson={viewing}
        open={!!viewing}
        onOpenChange={(o) => {
          if (!o) setViewing(null);
        }}
      />
    </div>
  );
}

function PendingFileRow({
  pending,
  onRemove,
}: {
  pending: PendingFile;
  onRemove: () => void;
}) {
  const isImage = pending.file.type.startsWith("image/");
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background/50 px-2 py-1.5 text-sm">
      {isImage ? (
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground" />
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-medium">{pending.file.name}</span>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {humanSize(pending.file.size)}
        </Badge>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function PendingLinkRow({
  pending,
  onRemove,
}: {
  pending: PendingLink;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background/50 px-2 py-1.5 text-sm">
      <LinkIcon className="h-4 w-4 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{pending.name}</span>
        <span className="truncate text-[10px] text-muted-foreground">
          {pending.url}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}