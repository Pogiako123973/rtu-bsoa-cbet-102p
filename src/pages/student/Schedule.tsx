import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSchedule, type ScheduleEntry } from "@/lib/api";
import { formatTimeRange } from "@/lib/format";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Show at most this many entries per day by default; the rest hide behind
// a "+ N more" button so the card stays compact.
const PREVIEW_COUNT = 2;

export default function StudentSchedule() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    listSchedule()
      .then(setEntries)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Live updates: refetch when schedule changes anywhere in the system.
  useEffect(() => {
    function onChange(e: Event) {
      const table = (e as CustomEvent<{ table: string }>).detail?.table;
      if (table !== "schedules") return;
      listSchedule()
        .then(setEntries)
        .catch((err) => toast.error(err.message));
    }
    window.addEventListener("classdesk:data-changed", onChange);
    return () => window.removeEventListener("classdesk:data-changed", onChange);
  }, []);

  const byDay = useMemo(() => {
    const groups: Record<number, ScheduleEntry[]> = {};
    for (const e of entries) (groups[e.day_of_week] ??= []).push(e);
    // Sort each day by start time so the day always reads top-to-bottom.
    for (const day of Object.keys(groups)) {
      groups[Number(day)].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return groups;
  }, [entries]);

  function toggleExpanded(day: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  return (
    <div>
      <PageHeader title="Weekly Schedule" description="Your classes for the week." />
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {DAYS.map((day, i) => {
            const items = byDay[i] ?? [];
            const isExpanded = expanded.has(i);
            const visible = isExpanded ? items : items.slice(0, PREVIEW_COUNT);
            const hiddenCount = items.length - visible.length;
            return (
              <Card key={day} className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-display text-base">{day}</CardTitle>
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
                          <div key={e.id} className="student-row">
                          <div
                            className="flex min-h-[2.25rem] flex-col justify-center rounded-md border bg-card/40 px-2.5 py-1 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium leading-tight">{e.subject}</span>
                              <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                                {formatTimeRange(e.start_time, e.end_time)}
                              </span>
                            </div>
                            {e.room && (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {e.room}
                              </p>
                            )}
                          </div>
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