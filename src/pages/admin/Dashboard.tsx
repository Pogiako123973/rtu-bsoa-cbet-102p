import { useEffect, useState } from "react";
import {
  Users,
  BookOpen,
  ScrollText,
  ClipboardCheck,
  Calendar,
  CalendarPlus,
  BookOpenCheck,
  Radio,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listStudents, listLessons, listAssignments, listSchedule, listMyAttendance } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useActivityFeed, type ActivityItem } from "@/lib/activityStore";
import { cn } from "@/lib/utils";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const FEED_STYLES: Record<ActivityItem["kind"], { icon: typeof BookOpenCheck; accent: string; ring: string }> = {
  lesson: {
    icon: BookOpenCheck,
    accent: "bg-blue-500/10 text-blue-600",
    ring: "before:bg-blue-500",
  },
  schedule: {
    icon: CalendarPlus,
    accent: "bg-amber-500/10 text-amber-600",
    ring: "before:bg-amber-500",
  },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    students: 0,
    lessons: 0,
    schedule: 0,
    assignments: 0,
    attendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);
  const feed = useActivityFeed();

  async function refreshCounts() {
    try {
      const [s, l, sc, a, at] = await Promise.all([
        listStudents(),
        listLessons(),
        listSchedule(),
        listAssignments(),
        user ? listMyAttendance(user.id) : Promise.resolve([]),
      ]);
      setCounts({
        students: s.length,
        lessons: l.length,
        schedule: sc.length,
        assignments: a.length,
        attendance: at.length,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Re-fetch counts whenever any tracked table changes, wherever in the app
  // that happened — this is the same event useRealtimeNotifications already
  // broadcasts, so this stays correct for inserts, updates, and deletes
  // without needing its own realtime subscription here.
  useEffect(() => {
    function handleDataChanged() {
      refreshCounts();
    }
    window.addEventListener("classdesk:data-changed", handleDataChanged);
    return () => window.removeEventListener("classdesk:data-changed", handleDataChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Re-render every 30s just to keep the "Xm ago" labels fresh.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const cards = [
    { label: "Students", count: counts.students, icon: Users },
    { label: "Lessons", count: counts.lessons, icon: BookOpen },
    { label: "Schedule entries", count: counts.schedule, icon: Calendar },
    { label: "Assignments", count: counts.assignments, icon: ScrollText },
    { label: "Attendance marks", count: counts.attendance, icon: ClipboardCheck },
  ];

  return (
    <div>
      <PageHeader title="Admin overview" description="A snapshot of the portal." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ label, count, icon: Icon }) => (
          <Card key={label} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-semibold">
                {loading ? "—" : count}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="font-display text-base">Live activity</CardTitle>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Radio className="h-3 w-3" />
            Realtime
          </span>
        </CardHeader>
        <CardContent>
          {feed.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Radio className="h-5 w-5 opacity-40" />
              <p>Waiting for activity — new lessons and schedule changes will show up here instantly.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {feed.map((item, idx) => {
                const style = FEED_STYLES[item.kind];
                const Icon = style.icon;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "relative flex items-start gap-3 overflow-hidden rounded-lg border bg-card p-3",
                      "before:absolute before:left-0 before:top-0 before:h-full before:w-1",
                      style.ring,
                      idx === 0 && "animate-in fade-in slide-in-from-top-2 duration-300"
                    )}
                  >
                    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", style.accent)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">{item.title}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(item.at)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}