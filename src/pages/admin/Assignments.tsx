import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Clock,
  FileText,
  Inbox,
  Loader2,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import {
  createAssignment,
  deleteAssignment,
  listAssignments,
  listStudentSubmissions,
  type Assignment,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

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

export default function AdminAssignments() {
  const { user } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const list = await listAssignments();
      setItems(list);
      const counts = await Promise.all(
        list.map((a) =>
          listStudentSubmissions(a.id)
            .then((subs) => [a.id, subs.length] as const)
            .catch(() => [a.id, 0] as const),
        ),
      );
      setSubmissionCounts(Object.fromEntries(counts));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    function onChange(e: Event) {
      const table = (e as CustomEvent<{ table: string }>).detail?.table;
      if (table === "assignments") refresh();
    }
    window.addEventListener("classdesk:data-changed", onChange);
    return () => window.removeEventListener("classdesk:data-changed", onChange);
  }, []);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
      ),
    [items],
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await createAssignment({
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim(),
        due_date: new Date(due).toISOString(),
        created_by: user.id,
      });
      toast.success("Assignment posted");
      setOpen(false);
      setTitle("");
      setSubject("");
      setDescription("");
      setDue("");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this assignment? Submissions will be removed too.")) return;
    try {
      await deleteAssignment(id);
      setItems((p) => p.filter((x) => x.id !== id));
      toast.success("Assignment deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const stats = useMemo(() => {
    const total = items.length;
    const due = items.filter((a) => dueBucket(a.due_date) === "soon").length;
    const overdue = items.filter((a) => dueBucket(a.due_date) === "overdue").length;
    return { total, due, overdue };
  }, [items]);

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Create, track, and review student work."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-soft">
                <Plus className="mr-2 h-4 w-4" /> New assignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New assignment</DialogTitle>
                <DialogDescription>
                  Students will see this in their portal immediately.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Chapter 5 exercises"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Math"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due</Label>
                    <Input
                      type="datetime-local"
                      required
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    required
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What students need to do, and how it'll be graded."
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post
                    assignment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {!loading && items.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={FileText}
            label="Total assignments"
            value={stats.total}
            tone="primary"
          />
          <StatCard
            icon={Clock}
            label="Due within 48h"
            value={stats.due}
            tone="warning"
          />
          <StatCard
            icon={CalendarClock}
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
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Inbox className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-base font-semibold">No assignments yet</p>
              <p className="text-sm text-muted-foreground">
                Post your first assignment and students will see it here.
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-1"
              onClick={() => setOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Create assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((a) => {
            const bucket = dueBucket(a.due_date);
            const subs = submissionCounts[a.id] ?? 0;
            return (
              <Card
                key={a.id}
                className="group relative overflow-hidden border transition-all hover:shadow-lift"
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
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${DUE_STYLES[bucket]}`}
                        >
                          {bucket === "overdue" ? "Overdue" : `Due ${relativeDue(a.due_date)}`}
                        </span>
                      </div>
                      <h3 className="mt-2 truncate font-display text-base font-semibold">
                        {a.title}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(a.id)}
                      title="Delete"
                      className="opacity-60 transition-opacity hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                    {a.description}
                  </p>

                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span className="tabular-nums">
                        {subs} {subs === 1 ? "submission" : "submissions"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span>
                        {new Date(a.due_date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
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
  tone: "primary" | "warning" | "destructive" | "muted";
}) {
  const toneStyles: Record<typeof tone, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
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
