import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ClipboardCheck,
  ScrollText,
  BookOpen,
  BookOpenCheck,
  CalendarPlus,
  ChevronRight,
  Radio,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { listAssignments, listMyAttendance, listLessons, listSchedule } from "@/lib/api";
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

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ lessons: 0, schedule: 0, assignments: 0, attendance: 0 });
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);
  const feed = useActivityFeed();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lessons, schedule, assignments, attendance] = await Promise.all([
          listLessons(),
          listSchedule(),
          listAssignments(),
          user ? listMyAttendance(user.id) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setCounts({
            lessons: lessons.length,
            schedule: schedule.length,
            assignments: assignments.length,
            attendance: attendance.length,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Keep the "Xm ago" labels fresh without needing a new realtime event.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const cards = [
    { label: "Lessons", count: counts.lessons, icon: BookOpen, to: "/student/lessons" },
    { label: "Schedule", count: counts.schedule, icon: Calendar, to: "/student/schedule" },
    { label: "Assignments", count: counts.assignments, icon: ScrollText, to: "/student/assignments" },
    { label: "Attendance", count: counts.attendance, icon: ClipboardCheck, to: "/student/attendance" },
  ];

  return (
    <div>
      <PageHeader
        title={`Hi, ${profile?.full_name?.split(" ")[0] ?? "there"} 👋`}
        description="Here’s a quick look at your portal."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, count, icon: Icon, to }) => (
          <Link key={label} to={to}>
            <Card className="transition-shadow hover:shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-semibold">
                  {loading ? "—" : count}
                </p>
                <p className="text-xs text-muted-foreground">total</p>
              </CardContent>
            </Card>
          </Link>
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
                const destination =
                  item.kind === "lesson" ? "/student/lessons" : "/student/schedule";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(item.refId ? `${destination}?highlight=${item.refId}` : destination)
                      }
                      className={cn(
                        "group relative flex w-full items-start gap-3 overflow-hidden rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40",
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
                      <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display text-lg">Welcome to ClassDesk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Your account is set up as a <span className="font-medium">student</span>. Use the sidebar to
            navigate to lessons, the weekly schedule, assignments, your attendance record, and chat.
          </p>
          <p>
            Need help? Reach out via <Link className="text-primary hover:underline" to="/student/chat">Chat</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}