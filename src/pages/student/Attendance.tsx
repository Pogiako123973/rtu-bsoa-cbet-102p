import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { listMyAttendance, type AttendanceRecord } from "@/lib/api";

export default function StudentAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listMyAttendance(user.id)
      .then(setRecords)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const summary = {
    present: records.filter((r) => r.status === "present").length,
    late: records.filter((r) => r.status === "late").length,
    absent: records.filter((r) => r.status === "absent").length,
  };

  return (
    <div>
      <PageHeader title="Attendance" description="Your attendance record." />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-semibold text-success">
            {summary.present}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Late</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-semibold text-warning">
            {summary.late}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-semibold text-destructive">
            {summary.absent}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records yet.</p>
          ) : (
            <ul className="divide-y">
              {records.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{r.date}</span>
                  <Badge
                    variant={
                      r.status === "present"
                        ? "default"
                        : r.status === "late"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}