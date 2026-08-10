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
import { listStudents } from "@/lib/api";

interface StudentRow {
  id: string;
  email: string;
  full_name: string | null;
  student_id: string | null;
  created_at: string;
}

export default function AdminStudents() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listStudents()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Students" description="Everyone with a student account." />
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">{rows.length} students</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students have signed up yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Name</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Student ID</th>
                    <th className="py-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 font-medium">{r.full_name ?? "—"}</td>
                      <td className="py-2">{r.email}</td>
                      <td className="py-2">{r.student_id ?? "—"}</td>
                      <td className="py-2">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}