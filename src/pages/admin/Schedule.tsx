import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createScheduleEntry,
  deleteScheduleEntry,
  listSchedule,
  listStudents,
  type ScheduleEntry,
  type StudentLite,
} from "@/lib/api";
import { SmartTimeInput } from "@/components/SmartTimeInput";
import { formatTimeRange } from "@/lib/format";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PREVIEW_COUNT = 2;

function displayStudent(s: StudentLite): string {
  const name = s.full_name?.trim() || s.email;
  return s.student_id ? `${name} (${s.student_id})` : name;
}

export default function AdminSchedule() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [studentId, setStudentId] = useState<string>(""); 
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);

  const [filterStudentId, setFilterStudentId] = useState<string>("");

  function refresh() {
    setLoading(true);
    Promise.all([listSchedule(), listStudents()])
      .then(([sched, studs]) => {
        setEntries(sched);
        setStudents(studs);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    function onChange(e: Event) {
      const table = (e as CustomEvent<{ table: string }>).detail?.table;
      if (table === "schedules") refresh();
    }
    window.addEventListener("classdesk:data-changed", onChange);
    return () => window.removeEventListener("classdesk:data-changed", onChange);
  }, []);

  const studentLabel = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of students) m[s.id] = displayStudent(s);
    return m;
  }, [students]);

  const visibleEntries = useMemo(() => {
    if (filterStudentId === "") return entries;
    if (filterStudentId === "__shared__")
      return entries.filter((e) => e.student_id === null);
    return entries.filter(
      (e) => e.student_id === filterStudentId || e.student_id === null,
    );
  }, [entries, filterStudentId]);

  const byDay = useMemo(() => {
    const g: Record<number, ScheduleEntry[]> = {};
    for (const e of visibleEntries) (g[e.day_of_week] ??= []).push(e);
    for (const day of Object.keys(g)) {
      g[Number(day)].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return g;
  }, [visibleEntries]);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  function toggleExpanded(day: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createScheduleEntry({
        student_id: studentId || null,
        subject: subject.trim(),
        day_of_week: Number(day),
        start_time: start,
        end_time: end,
        room: room.trim() || null,
      });
      toast.success("Schedule entry added");
      setOpen(false);
      setSubject("");
      setStart("");
      setEnd("");
      setRoom("");
      setStudentId("");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteScheduleEntry(id);
      setEntries((p) => p.filter((e) => e.id !== id));
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function onClearFiltered() {
    const targets = entries.filter((e) => {
      if (filterStudentId === "") return true;
      if (filterStudentId === "__shared__") return e.student_id === null;
      return e.student_id === filterStudentId;
    });
    if (targets.length === 0) return;
    const label =
      filterStudentId === "__shared__"
        ? "all shared entries"
        : students.find((s) => s.id === filterStudentId)
        ? `schedule of ${displayStudent(students.find((s) => s.id === filterStudentId)!)}`
        : "the selected scope";
    if (!confirm(`Delete ${targets.length} ${label}? This can't be undone.`)) return;
    try {
      await Promise.all(targets.map((e) => deleteScheduleEntry(e.id)));
      const removed = new Set(targets.map((e) => e.id));
      setEntries((p) => p.filter((e) => !removed.has(e.id)));
      toast.success(`Deleted ${targets.length} entr${targets.length === 1 ? "y" : "ies"}.`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Schedule"
        description="Each student's weekly schedule. Pick a student to view only theirs."
        action={
          <div className="flex items-center gap-2">
            <Select value={filterStudentId} onValueChange={setFilterStudentId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All entries</SelectItem>
                <SelectItem value="__shared__">Shared (all students)</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {displayStudent(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterStudentId !== "" && visibleEntries.length > 0 && (
              <Button
                variant="outline"
                onClick={onClearFiltered}
                title={
                  filterStudentId === "__shared__"
                    ? "Delete all shared entries"
                    : "Delete all schedule entries for this student"
                }
              >
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                Clear ({visibleEntries.length})
              </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> New entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New schedule entry</DialogTitle>
                  <DialogDescription>
                    Add a class block for a specific student.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={onCreate} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Student</Label>
                    <Select value={studentId} onValueChange={setStudentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a student or All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All students</SelectItem>
                        {students.length === 0 ? null : (
                          students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {displayStudent(s)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Pick a specific student, or <em>All students</em> for a class-wide block.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input required value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <Select value={day} onValueChange={setDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SmartTimeInput
                      id="start"
                      label="Start"
                      required
                      value={start}
                      onChange={setStart}
                    />
                    <SmartTimeInput
                      id="end"
                      label="End"
                      required
                      value={end}
                      onChange={setEnd}
                      siblingStart={start}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Room (optional)</Label>
                    <Input value={room} onChange={(e) => setRoom(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={busy}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No student accounts yet. Once students sign up, you'll see them
            here to assign schedules.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {DAYS.map((d, i) => {
            const items = byDay[i] ?? [];
            const isExpanded = expanded.has(i);
            const visible = isExpanded ? items : items.slice(0, PREVIEW_COUNT);
            const hiddenCount = items.length - visible.length;
            return (
              <Card key={d} className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-display text-base">{d}</CardTitle>
                  {items.length > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {items.length} {items.length === 1 ? "class" : "classes"}
                    </span>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-1.5 pt-0">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No classes.</p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        {visible.map((e) => (
                          <div key={e.id} className="admin-row">
                          <ScheduleRow
                            entry={e}
                            studentLabel={
                              e.student_id
                                ? studentLabel[e.student_id] ?? e.student_id
                                : null
                            }
                            onDelete={() => onDelete(e.id)}
                          />
                          </div>
                        ))}
                      </div>
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleExpanded(i)}
                          className={`mt-auto inline-flex items-center justify-center gap-1.5 self-center rounded-full border px-3 py-1 text-xs font-medium transition-all hover:scale-105 ${
                            isExpanded
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-dashed border-border bg-background text-muted-foreground hover:border-foreground/40 hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Hide {hiddenCount} {hiddenCount === 1 ? "class" : "classes"}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Show {hiddenCount} more
                            </>
                          )}
                        </button>
                      )}
                    </>
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

function ScheduleRow({
  entry,
  studentLabel,
  onDelete,
}: {
  entry: ScheduleEntry;
  studentLabel: string | null;
  onDelete: () => void;
}) {
  const isShared = entry.student_id === null;
  return (
    <div className="group flex min-h-[2.25rem] items-center gap-2 rounded-md border bg-card/40 px-2.5 py-1 text-sm transition-colors hover:bg-accent">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium leading-tight">{entry.subject}</span>
          <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatTimeRange(entry.start_time, entry.end_time)}
          </span>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11px] text-muted-foreground">
          <span
            className={`inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${
              isShared ? "bg-primary" : "bg-muted-foreground/50"
            }`}
            aria-hidden
          />
          <span className="truncate">
            {isShared ? "All students" : studentLabel ?? entry.student_id}
          </span>
          {entry.room && (
            <>
              <span className="shrink-0 text-border">·</span>
              <span className="truncate">{entry.room}</span>
            </>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onDelete}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}