import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listLessons,
  searchLessons,
  type Lesson,
} from "@/lib/api";
import { LessonViewer } from "@/components/LessonViewer";
import { LessonCard } from "@/components/LessonCard";

export default function StudentLessons() {
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [viewing, setViewing] = useState<Lesson | null>(null);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  useEffect(() => {
    listLessons()
      .then((rows) => {
        setAllLessons(rows);
        setLessons(rows);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Debounced full-text search (matches title / subject / notes / file
  // contents / link metadata). Empty query → restore the full list.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setLessons(allLessons);
      setSearchLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setSearchLoading(true);
    const handle = setTimeout(() => {
      searchLessons(trimmed)
        .then((rows) => {
          if (!ctrl.signal.aborted) setLessons(rows);
        })
        .catch((e) => toast.error(e.message))
        .finally(() => {
          if (!ctrl.signal.aborted) setSearchLoading(false);
        });
    }, 220);
    return () => {
      ctrl.abort();
      clearTimeout(handle);
    };
  }, [query, allLessons]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    allLessons.forEach((l) => set.add(l.subject));
    return Array.from(set).sort();
  }, [allLessons]);

  const visible = useMemo(() => {
    if (subjectFilter === "all") return lessons;
    return lessons.filter((l) => l.subject === subjectFilter);
  }, [lessons, subjectFilter]);

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
        // `items-stretch` keeps every card in a row the same height as the
        // tallest sibling — no manual min-h needed per card.
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((l) => (
            <LessonCard key={l.id} lesson={l} onView={() => setViewing(l)} />
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