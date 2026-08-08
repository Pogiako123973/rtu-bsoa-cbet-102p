import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, DoorOpen, User2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/useRealtime";
import { DAYS, SHORT_DAYS, formatTime } from "@/lib/school";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "My schedule — ClassDesk" },
      { name: "description", content: "Your personal weekly class schedule with rooms and teachers." },
      { property: "og:title", content: "My schedule — ClassDesk" },
      { property: "og:description", content: "Your own timetable, updated live by your school." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const [view, setView] = useState<"day" | "week">("day");
  const [day, setDay] = useState(new Date().getDay());

  const schedule = useQuery({
    queryKey: ["schedule", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  useRealtime("schedules", [["schedule", "mine"], ["schedule", "today"]], () =>
    toast.info("Your schedule was updated"),
  );

  const rows = schedule.data ?? [];

  return (
    <AppShell title="My schedule" subtitle="Only your classes — nobody else's">
      <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "day" ? (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SHORT_DAYS.map((label, i) => (
              <button
                key={label}
                onClick={() => setDay(i)}
                className={cn(
                  "min-w-14 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  day === i
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <DayList rows={rows.filter((r) => r.day_of_week === day)} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {DAYS.map((label, i) => (
            <div key={label} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </h2>
              <DayList rows={rows.filter((r) => r.day_of_week === i)} compact />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

type Row = {
  id: string;
  subject_name: string;
  start_time: string;
  end_time: string;
  room: string;
  teacher_name: string;
};

function DayList({ rows, compact }: { rows: Row[]; compact?: boolean }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className={compact ? "py-4" : "py-10"}>
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden /> No classes
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={r.id} className="shadow-soft">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <span className="w-36 shrink-0 text-sm font-semibold text-primary">
              {formatTime(r.start_time)}–{formatTime(r.end_time)}
            </span>
            <span className="flex-1 font-medium">{r.subject_name || "Class"}</span>
            {r.room && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <DoorOpen className="size-4" aria-hidden />
                {r.room}
              </span>
            )}
            {r.teacher_name && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <User2 className="size-4" aria-hidden />
                {r.teacher_name}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
