import { useEffect, useState } from "react";
import { Users, BookOpen, ScrollText, ClipboardCheck, Calendar } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listStudents, listLessons, listAssignments, listSchedule, listMyAttendance } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

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

  useEffect(() => {
    (async () => {
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
    })();
  }, [user]);

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
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-semibold">
                {loading ? "—" : count}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}