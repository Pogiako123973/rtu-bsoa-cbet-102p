import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fetchAttachmentText,
  lessonAttachments,
  listLessons,
  type Lesson,
} from "@/lib/api";
import { LessonViewer } from "@/components/LessonViewer";
import { LessonCard } from "@/components/LessonCard";
import { cn } from "@/lib/utils";

export default function StudentLessons() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Lesson | null>(null);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [flashId, setFlashId] = useState<string | null>(null);

  const [extraTexts, setExtraTexts] = useState<Record<string, string>>({});
  const fetchingPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    listLessons()
      .then((rows) => {
        setAllLessons(rows);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Deep-link support: /student/lessons?highlight=<lessonId> (e.g. from the
  // Live activity feed) clears any active search/filter so the target
  // can't be hidden, opens its viewer automatically, scrolls to the card,
  // and briefly rings it. Strips the param afterward.
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (!highlightId || loading) return;
    const target = allLessons.find((l) => l.id === highlightId);
    if (!target) return;

    setQuery("");
    setSubjectFilter("all");
    setViewing(target);
    setFlashId(target.id);

    requestAnimationFrame(() => {
      document
        .getElementById(`lesson-${target.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    const flashTimer = setTimeout(() => setFlashId(null), 2500);

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("highlight");
        return next;
      },
      { replace: true },
    );

    return () => clearTimeout(flashTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, allLessons, loading]);

  useEffect(() => {
    const todo: { path: string; name: string; type: string }[] = [];
    for (const l of allLessons) {
      for (const a of lessonAttachments(l)) {
        if (a.kind !== "file") continue;
        if (l.attachment_texts?.[a.path]) continue; // already indexed
        if (extraTexts[a.path] !== undefined) continue; // already fetched
        if (fetchingPathsRef.current.has(a.path)) continue; // in flight
        todo.push({ path: a.path, name: a.name, type: a.type });
      }
    }
    if (todo.length === 0) return;

    todo.forEach((a) => fetchingPathsRef.current.add(a.path));
    Promise.allSettled(
      todo.map(async (a) => {
        const text = await fetchAttachmentText(a.path, a.name, a.type);
        setExtraTexts((prev) => ({ ...prev, [a.path]: text ?? "" }));
      }),
    );
  }, [allLessons]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    allLessons.forEach((l) => set.add(l.subject));
    return Array.from(set).sort();
  }, [allLessons]);

  const visible = useMemo(() => {
    const trimmed = query.trim();

    let pool = allLessons;
    if (subjectFilter !== "all") {
      pool = pool.filter((l) => l.subject === subjectFilter);
    }

    if (!trimmed) return pool;

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
      for (const a of lessonAttachments(l)) {
        parts.push(a.name);
        if (a.kind === "link") parts.push(a.url);
        if (a.kind === "file" && extraTexts[a.path]) {
          parts.push(extraTexts[a.path]);
        }
      }
      return parts.join(" ").toLowerCase();
    };

    const haystack = (l: Lesson) =>
      [l.title, l.subject, l.content, attachText(l)].join(" ").toLowerCase();

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
        description="Course material published by your admin."
      />

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
          {visible.length} {visible.length === 1 ? "lesson" : "lessons"}{" "}
          match "{query.trim()}"
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading lessons…
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {query.trim() ? (
              <>
                No lessons match <strong>"{query.trim()}"</strong>
                {subjectFilter !== "all" && <> in {subjectFilter}</>}.
              </>
            ) : (
              <>No lessons yet. Your admin hasn’t published anything.</>
            )}
          </CardContent>
        </Card>
      ) : (   
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((l) => (
            <div
              key={l.id}
              id={`lesson-${l.id}`}
              className={cn(
                "rounded-lg transition-shadow duration-700",
                flashId === l.id && "ring-2 ring-primary ring-offset-2",
              )}
            >
              <LessonCard lesson={l} onView={() => setViewing(l)} />
            </div>
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