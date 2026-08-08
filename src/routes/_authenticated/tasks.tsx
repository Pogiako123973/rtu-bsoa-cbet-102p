import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, Plus, Upload } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { formatDateTime, openStorageFile, relativeDueLabel } from "@/lib/school";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — ClassDesk" },
      { name: "description", content: "Assignments from your teachers plus your own to-do list." },
      { property: "og:title", content: "Tasks — ClassDesk" },
      { property: "og:description", content: "Track assignments, deadlines and personal tasks." },
    ],
  }),
  component: TasksPage,
});

type Filter = "all" | "today" | "week" | "overdue" | "done";

function TasksPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");

  const assignments = useQuery({
    queryKey: ["assignments", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, title, description, due_at, max_score, file_path, subjects(name)")
        .order("due_at");
      if (error) throw error;
      return data;
    },
  });

  const submissions = useQuery({
    queryKey: ["submissions", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, assignment_id, status, grade, remarks, file_path, submitted_at");
      if (error) throw error;
      return data;
    },
  });

  const todos = useQuery({
    queryKey: ["todos", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase.from("todos").select("*").order("due_at");
      if (error) throw error;
      return data;
    },
  });

  useRealtime("assignments", [["assignments", "mine"]], (row) =>
    toast.info(`New assignment: ${String(row["title"] ?? "")}`),
  );
  useRealtime("todos", [["todos", "mine"]]);

  const toggleTodo = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("todos")
        .update({ is_completed: done, completed_at: done ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos", "mine"] }),
  });

  const inRange = (due: string | null, f: Filter) => {
    if (f === "all" || f === "done") return true;
    if (!due) return false;
    const t = new Date(due).getTime();
    if (f === "overdue") return t < Date.now();
    if (f === "today") return new Date(due).toDateString() === new Date().toDateString();
    return t >= Date.now() && t < Date.now() + 7 * 86_400_000;
  };

  const submissionFor = (assignmentId: string) =>
    (submissions.data ?? []).find((s) => s.assignment_id === assignmentId);

  const visibleAssignments = useMemo(
    () =>
      (assignments.data ?? []).filter((a) => {
        const submitted = Boolean(submissionFor(a.id));
        if (filter === "done") return submitted;
        return !submitted && inRange(a.due_at, filter);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignments.data, submissions.data, filter],
  );

  const visibleTodos = useMemo(
    () =>
      (todos.data ?? []).filter((t) => {
        if (filter === "done") return t.is_completed;
        return !t.is_completed && inRange(t.due_at, filter);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos.data, filter],
  );

  const pendingCount =
    (assignments.data ?? []).filter((a) => !submissionFor(a.id)).length +
    (todos.data ?? []).filter((t) => !t.is_completed).length;

  return (
    <AppShell title="Tasks" subtitle={`${pendingCount} pending item${pendingCount === 1 ? "" : "s"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
        </Tabs>
        <NewTodoDialog studentId={me?.userId} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Assignments
        </h2>
        {visibleAssignments.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}
        {visibleAssignments.map((a) => {
          const due = relativeDueLabel(a.due_at);
          const submission = submissionFor(a.id);
          return (
            <Card key={a.id} className="shadow-soft">
              <CardContent className="flex flex-wrap items-start gap-4 py-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge
                      className={
                        due.tone === "danger"
                          ? "bg-destructive text-destructive-foreground"
                          : due.tone === "warning"
                            ? "bg-warning text-warning-foreground"
                            : "bg-secondary text-secondary-foreground"
                      }
                    >
                      {due.tone === "danger" && <AlertTriangle className="mr-1 size-3" aria-hidden />}
                      {due.label}
                    </Badge>
                  </div>
                  {a.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.subjects?.name ?? "General"} · due {formatDateTime(a.due_at)}
                    {a.max_score ? ` · ${a.max_score} pts` : ""}
                  </p>
                  {submission && (
                    <p className="mt-1 text-xs font-medium text-success">
                      Submitted {formatDateTime(submission.submitted_at)}
                      {submission.grade !== null && submission.grade !== undefined
                        ? ` · Grade: ${submission.grade}`
                        : ""}
                      {submission.remarks ? ` · ${submission.remarks}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {a.file_path && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openStorageFile("lessons", a.file_path!).catch(() => toast.error("Could not open file"))}
                    >
                      Instructions
                    </Button>
                  )}
                  <SubmitDialog assignmentId={a.id} studentId={me?.userId} submitted={Boolean(submission)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          My to-dos
        </h2>
        {visibleTodos.length === 0 && (
          <p className="text-sm text-muted-foreground">No personal tasks in this view.</p>
        )}
        {visibleTodos.map((t) => {
          const due = relativeDueLabel(t.due_at);
          return (
            <Card key={t.id}>
              <CardContent className="flex items-start gap-3 py-4">
                <Checkbox
                  checked={t.is_completed}
                  onCheckedChange={(v) => toggleTodo.mutate({ id: t.id, done: Boolean(v) })}
                  className="mt-1"
                  aria-label={`Mark ${t.title} complete`}
                />
                <div className="min-w-0 flex-1">
                  <p className={t.is_completed ? "font-medium line-through opacity-60" : "font-medium"}>
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" aria-hidden /> {due.label} ·{" "}
                    {t.priority} priority
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </AppShell>
  );
}

function NewTodoDialog({ studentId }: { studentId: string | undefined }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("medium");

  const create = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("Not signed in");
      const { error } = await supabase.from("todos").insert({
        student_id: studentId,
        title,
        description,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task added");
      queryClient.invalidateQueries({ queryKey: ["todos", "mine"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setDueAt("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add task"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden /> Add task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New personal task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="todo-title">Title</Label>
            <Input id="todo-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="todo-desc">Notes</Label>
            <Textarea
              id="todo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="todo-due">Due</Label>
              <Input
                id="todo-due"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={!title || create.isPending}>
            Add task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmitDialog({
  assignmentId,
  studentId,
  submitted,
}: {
  assignmentId: string;
  studentId: string | undefined;
  submitted: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("Not signed in");
      let filePath: string | null = null;
      if (file) {
        filePath = `${studentId}/${assignmentId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("submissions").upload(filePath, file);
        if (error) throw error;
      }
      const { error } = await supabase.from("submissions").upsert(
        {
          assignment_id: assignmentId,
          student_id: studentId,
          note,
          file_path: filePath,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "assignment_id,student_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Work submitted");
      queryClient.invalidateQueries({ queryKey: ["submissions", "mine"] });
      setOpen(false);
      setNote("");
      setFile(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={submitted ? "secondary" : "default"}>
          <Upload className="size-4" aria-hidden /> {submitted ? "Resubmit" : "Submit"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit your work</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sub-file">File (optional)</Label>
            <Input
              id="sub-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-note">Note for your teacher</Label>
            <Textarea id="sub-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
