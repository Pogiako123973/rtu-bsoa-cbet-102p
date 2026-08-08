import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Clock, DoorOpen, ListChecks } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { DAYS, fileKind, formatTime, relativeDueLabel } from "@/lib/school";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Today — ClassDesk" },
      { name: "description", content: "Your next class, tasks due today and newly posted lessons." },
      { property: "og:title", content: "Today — ClassDesk" },
      { property: "og:description", content: "Your classes, tasks and lessons for today." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: me } = useMe();
  const today = new Date().getDay();

  const schedule = useQuery({
    queryKey: ["schedule", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("day_of_week", today)
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const lessons = useQuery({
    queryKey: ["lessons", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, file_type, file_path, created_at, subjects(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const tasks = useQuery({
    queryKey: ["tasks", "upcoming"],
    queryFn: async () => {
      const [assignments, todos] = await Promise.all([
        supabase
          .from("assignments")
          .select("id, title, due_at, subjects(name)")
          .order("due_at")
          .limit(20),
        supabase
          .from("todos")
          .select("id, title, due_at, is_completed")
          .eq("is_completed", false)
          .order("due_at")
          .limit(20),
      ]);
      if (assignments.error) throw assignments.error;
      if (todos.error) throw todos.error;
      return { assignments: assignments.data, todos: todos.data };
    },
  });

  useRealtime("lessons", [["lessons", "recent"]], (row) => {
    toast.success(`New lesson posted: ${String(row["title"] ?? "")}`);
  });
  useRealtime("schedules", [["schedule", "today"]], () => toast.info("Your schedule was updated"));
  useRealtime("assignments", [["tasks", "upcoming"]], (row) =>
    toast.info(`New assignment: ${String(row["title"] ?? "")}`),
  );

  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const nextClass = (schedule.data ?? []).find((s) => {
    const [h, m] = s.start_time.split(":");
    return Number(h) * 60 + Number(m) > minutesNow;
  });
  const minutesUntil = nextClass
    ? Number(nextClass.start_time.split(":")[0]) * 60 +
      Number(nextClass.start_time.split(":")[1]) -
      minutesNow
    : null;

  const firstName = (me?.profile?.full_name || me?.email || "there").split(" ")[0];
  const dueSoon = [
    ...(tasks.data?.assignments ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      due_at: a.due_at,
      source: a.subjects?.name ?? "Assignment",
    })),
    ...(tasks.data?.todos ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      due_at: t.due_at,
      source: "Personal task",
    })),
  ]
    .filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now() + 7 * 86_400_000)
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""))
    .slice(0, 5);

  return (
    <AppShell
      title={`Hi, ${firstName}! 👋`}
      subtitle={now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}
    >
      <Card className="border-primary/25 bg-panel shadow-soft">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Next class
            </p>
            {nextClass ? (
              <>
                <p className="mt-1 text-lg font-semibold">{nextClass.subject_name || "Class"}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(nextClass.start_time)}–{formatTime(nextClass.end_time)}
                  {nextClass.room ? ` · ${nextClass.room}` : ""}
                  {nextClass.teacher_name ? ` · ${nextClass.teacher_name}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-1 text-lg font-semibold">No more classes today</p>
            )}
          </div>
          {minutesUntil !== null && (
            <Badge className="bg-accent text-accent-foreground">
              <Clock className="mr-1 size-3.5" aria-hidden />
              starts in {minutesUntil} min
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{DAYS[today]}'s schedule</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link to="/schedule">Full week</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {(schedule.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
          )}
          {(schedule.data ?? []).map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3 text-sm"
            >
              <span className="w-32 shrink-0 font-medium text-primary">
                {formatTime(s.start_time)}–{formatTime(s.end_time)}
              </span>
              <span className="flex-1 font-medium">{s.subject_name || "Class"}</span>
              <span className="hidden items-center gap-1 text-muted-foreground sm:flex">
                <DoorOpen className="size-4" aria-hidden />
                {s.room || "—"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Due soon</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/tasks">
                <ListChecks className="size-4" aria-hidden /> All tasks
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueSoon.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing due in the next 7 days.</p>
            )}
            {dueSoon.map((t) => {
              const due = relativeDueLabel(t.due_at);
              return (
                <div key={t.id} className="rounded-xl border px-4 py-3">
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.source} · {due.label}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">New lessons</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/lessons">
                <BookOpen className="size-4" aria-hidden /> All lessons
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(lessons.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No lessons posted yet.</p>
            )}
            {(lessons.data ?? []).map((l) => (
              <div key={l.id} className="rounded-xl border px-4 py-3">
                <p className="text-sm font-medium">{l.title}</p>
                <p className="text-xs text-muted-foreground">
                  {l.subjects?.name ?? "General"} · {fileKind(l.file_type, l.file_path)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
