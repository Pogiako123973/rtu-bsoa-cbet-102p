import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  listAssignments,
  listMySubmissions,
  submitAssignment,
  type Assignment,
  type AssignmentSubmission,
} from "@/lib/api";

const SUBJECT_PALETTE = [
  "bg-primary/15 text-primary",
  "bg-chart-2/20 text-amber-700 dark:text-amber-300",
  "bg-chart-3/20 text-emerald-700 dark:text-emerald-300",
  "bg-chart-4/20 text-indigo-700 dark:text-indigo-300",
  "bg-chart-5/20 text-rose-700 dark:text-rose-300",
] as const;

function subjectStyles(subject: string): string {
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length];
}

export function relativeDue(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = t - now;
  const abs = Math.abs(diff);
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  const week = 7 * day;
  const past = diff < 0;
  let label: string;
  if (abs < hr) label = `${Math.max(1, Math.round(abs / min))}m`;
  else if (abs < day) label = `${Math.round(abs / hr)}h`;
  else if (abs < week) label = `${Math.round(abs / day)}d`;
  else label = `${Math.round(abs / week)}w`;
  return past ? `${label} overdue` : `in ${label}`;
}

function dueBucket(iso: string): "overdue" | "soon" | "later" {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 2 * 24 * 60 * 60 * 1000) return "soon";
  return "later";
}

const DUE_STYLES: Record<"overdue" | "soon" | "later", string> = {
  overdue: "bg-destructive/15 text-destructive",
  soon: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  later: "bg-muted text-muted-foreground",
};

export default function StudentAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, s] = await Promise.all([
          listAssignments(),
          user ? listMySubmissions(user.id) : Promise.resolve([]),
        ]);
        setAssignments(a);
        setSubmissions(s);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Live updates: any backend change to assignments or submissions refetches
  // the visible lists so the user sees fresh data without a manual refresh.
  useEffect(() => {
    function onChange(e: Event) {
      const table = (e as CustomEvent<{ table: string }>).detail?.table;
      if (table === "assignments" || table === "chat_messages") {
        listAssignments()
          .then(setAssignments)
          .catch((err) => toast.error(err.message));
      }
    }
    window.addEventListener("classdesk:data-changed", onChange);
    return () => window.removeEventListener("classdesk:data-changed", onChange);
  }, []);

  const submittedIds = useMemo(
    () => new Set(submissions.map((s) => s.assignment_id)),
    [submissions],
  );

  const subByAssignment = useMemo(() => {
    const m: Record<string, AssignmentSubmission> = {};
    for (const s of submissions) m[s.assignment_id] = s;
    return m;
  }, [submissions]);

  // Sort by status (pending first) then by due date so the most urgent work
  // surfaces at the top of the page.
  const sorted = useMemo(() => {
    const order = (a: Assignment) =>
      submittedIds.has(a.id) ? 1 : dueBucket(a.due_date) === "overdue" ? -1 : 0;
    return [...assignments].sort((a, b) => {
      const o = order(a) - order(b);
      if (o !== 0) return o;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [assignments, submittedIds]);

  const stats = useMemo(() => {
    const pending = assignments.filter((a) => !submittedIds.has(a.id)).length;
    const done = assignments.length - pending;
    const overdue = assignments.filter(
      (a) => !submittedIds.has(a.id) && dueBucket(a.due_date) === "overdue",
    ).length;
    return { pending, done, overdue };
  }, [assignments, submittedIds]);

  async function onSubmit(a: Assignment) {
    if (!user) return;
    const content = (draft[a.id] ?? "").trim();
    if (!content) {
      toast.error("Write something before submitting.");
      return;
    }
    setBusyId(a.id);
    try {
      const sub = await submitAssignment({
        assignment_id: a.id,
        student_id: user.id,
        content,
      });
      setSubmissions((prev) => [sub, ...prev]);
      setDraft((d) => ({ ...d, [a.id]: "" }));
      toast.success("Submitted!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Read instructions, draft your answer, and submit."
      />

      {!loading && assignments.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={FileText}
            label="Pending"
            value={stats.pending}
            tone="primary"
          />
          <StatCard
            icon={CheckCircle2}
            label="Submitted"
            value={stats.done}
            tone="success"
          />
          <StatCard
            icon={Clock}
            label="Overdue"
            value={stats.overdue}
            tone={stats.overdue > 0 ? "destructive" : "muted"}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-base font-semibold">All caught up!</p>
              <p className="text-sm text-muted-foreground">
                No assignments posted yet. Check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((a) => {
            const submitted = submittedIds.has(a.id);
            const bucket = dueBucket(a.due_date);
            const mySub = subByAssignment[a.id];
            return (
              <Card
                key={a.id}
                className={`group relative overflow-hidden border transition-all hover:shadow-lift ${
                  submitted ? "bg-card/60" : "bg-card"
                }`}
              >
                <div
                  className={`absolute inset-y-0 left-0 w-1 ${subjectStyles(a.subject).split(" ")[0]}`}
                  aria-hidden
                />
                <CardContent className="space-y-3 pl-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${subjectStyles(a.subject)}`}
                        >
                          {a.subject}
                        </span>
                        {submitted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Submitted
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${DUE_STYLES[bucket]}`}
                          >
                            {bucket === "overdue"
                              ? "Overdue"
                              : `Due ${relativeDue(a.due_date)}`}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 font-display text-base font-semibold">
                        {a.title}
                      </h3>
                    </div>
                  </div>

                  <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
                    {a.description}
                  </p>

                  <div className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>
                      Due {new Date(a.due_date).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {submitted && mySub && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Your submission · {new Date(mySub.submitted_at).toLocaleString()}
                      </p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-foreground/80">
                        {mySub.content}
                      </p>
                    </div>
                  )}

                  {!submitted && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit(a);
                      }}
                      className="space-y-2"
                    >
                      <Textarea
                        placeholder="Your answer…"
                        value={draft[a.id] ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, [a.id]: e.target.value })
                        }
                        rows={4}
                        className="resize-y"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">
                          {(draft[a.id] ?? "").length} characters
                        </p>
                        <Button
                          type="submit"
                          disabled={busyId === a.id}
                          size="sm"
                        >
                          {busyId === a.id ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-3.5 w-3.5" />
                          )}
                          Submit
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "primary" | "success" | "destructive" | "muted";
}) {
  const toneStyles: Record<typeof tone, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    destructive: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-soft">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneStyles[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
