import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ClipboardCheck, ScrollText, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { listAssignments, listMyAttendance, listLessons, listSchedule } from "@/lib/api";

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const [counts, setCounts] = useState({ lessons: 0, schedule: 0, assignments: 0, attendance: 0 });
  const [loading, setLoading] = useState(true);

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