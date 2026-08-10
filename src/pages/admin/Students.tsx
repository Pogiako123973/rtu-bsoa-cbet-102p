import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Users, Calendar, Trash2, X, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  listStudents,
  listAttendanceForStudent,
  deleteAttendanceRecord,
  deleteAllAttendanceForStudent,
  type AttendanceRecord,
} from "@/lib/api";

interface StudentRow {
  id: string;
  email: string;
  full_name: string | null;
  student_id: string | null;
  created_at: string;
}

function initialsFor(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/[\s,]+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusStyles(status: string) {
  switch (status) {
    case "present":
      return "bg-emerald-100 text-emerald-700";
    case "absent":
      return "bg-red-100 text-red-700";
    case "late":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function AdminStudents() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeStudent, setActiveStudent] = useState<StudentRow | null>(null);

  useEffect(() => {
    listStudents()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.student_id?.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div>
      <PageHeader title="Students" description="Everyone with a student account." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <span>
            <span className="font-medium text-foreground">{rows.length}</span> total students
          </span>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, or ID…"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "No students have signed up yet." : "No students match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => setActiveStudent(r)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initialsFor(r.full_name, r.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">{r.full_name ?? "Unnamed student"}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ClipboardCheck className="h-3 w-3" />
                      {r.student_id ?? "No ID"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeStudent && (
        <AttendanceDialog student={activeStudent} onClose={() => setActiveStudent(null)} />
      )}
    </div>
  );
}

function AttendanceDialog({
  student,
  onClose,
}: {
  student: StudentRow;
  onClose: () => void;
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    listAttendanceForStudent(student.id)
      .then(setRecords)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [student.id]);

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await deleteAttendanceRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("Attendance record deleted.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`Delete all ${records.length} attendance records for ${student.full_name ?? student.email}? This can't be undone.`)) {
      return;
    }
    setClearingAll(true);
    try {
      await deleteAllAttendanceForStudent(student.id);
      setRecords([]);
      toast.success("All attendance records deleted.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setClearingAll(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-background shadow-2xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initialsFor(student.full_name, student.email)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{student.full_name ?? "Unnamed student"}</p>
              <p className="truncate text-xs text-muted-foreground">{student.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {loading ? "Loading…" : `${records.length} record${records.length === 1 ? "" : "s"}`}
          </span>
          {!loading && records.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteAll}
              disabled={clearingAll}
              className="h-7 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {clearingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Clear all
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading attendance…
            </div>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No attendance records for this student yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {records.map((rec) => (
                <li
                  key={rec.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {new Date(rec.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        statusStyles(rec.status)
                      )}
                    >
                      {rec.status}
                    </span>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      disabled={busyId === rec.id}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      aria-label="Delete record"
                    >
                      {busyId === rec.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}