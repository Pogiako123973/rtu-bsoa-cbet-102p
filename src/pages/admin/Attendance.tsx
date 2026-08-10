import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  listSchedule,
  markAttendance,
  type ScheduleEntry,
} from "@/lib/api";
import { listStudents } from "@/lib/api";

interface StudentRow {
  id: string;
  email: string;
  full_name: string | null;
}

export default function AdminAttendance() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [studentId, setStudentId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"present" | "absent" | "late">("present");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, sc] = await Promise.all([listStudents(), listSchedule()]);
        setStudents(s as any);
        setSchedules(sc);
        if (s.length) setStudentId((s as any)[0].id);
        if (sc.length) setScheduleId(sc[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!studentId || !scheduleId) {
      toast.error("Pick a student and a schedule entry");
      return;
    }
    setBusy(true);
    try {
      await markAttendance({
        student_id: studentId,
        schedule_id: scheduleId,
        date,
        status,
      });
      toast.success("Saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Attendance" description="Mark attendance for a student." />
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">New record</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name ?? s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Schedule entry</Label>
                  <Select value={scheduleId} onValueChange={setScheduleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick entry" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedules.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.subject} · day {s.day_of_week} · {s.start_time}–{s.end_time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Tip</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Use <Badge>present</Badge>, <Badge variant="secondary">late</Badge>, or{" "}
                <Badge variant="destructive">absent</Badge> as the status.
              </p>
              <p>
                Each combination of (student, schedule entry, date) is unique — submitting again will
                overwrite the existing record.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}