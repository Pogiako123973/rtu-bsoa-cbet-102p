import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { DAYS, formatDate, formatTime } from "@/lib/school";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — ClassDesk" },
      {
        name: "description",
        content: "Manage students, lessons, schedules and assignments for your class.",
      },
      { property: "og:title", content: "Admin console — ClassDesk" },
      { property: "og:description", content: "Teacher tools for ClassDesk." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: me, isLoading } = useMe();

  if (isLoading) {
    return <AppShell title="Admin console">Loading…</AppShell>;
  }

  if (!me?.isStaff) {
    return (
      <AppShell title="Admin console" subtitle="Staff only">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You don't have access to this area.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin console" subtitle="Post lessons, set schedules and assign work">
      <Tabs defaultValue="lessons">
        <TabsList className="flex-wrap">
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="setup">Sections & subjects</TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="mt-6 space-y-6">
          <LessonUpload userId={me.userId} />
        </TabsContent>
        <TabsContent value="assignments" className="mt-6 space-y-6">
          <AssignmentForm userId={me.userId} />
        </TabsContent>
        <TabsContent value="schedules" className="mt-6 space-y-6">
          <ScheduleManager />
        </TabsContent>
        <TabsContent value="people" className="mt-6 space-y-6">
          <People isAdmin={me.isAdmin} />
        </TabsContent>
        <TabsContent value="setup" className="mt-6 space-y-6">
          <Setup />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function useSections() {
  return useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name, year_level")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useSubjects() {
  return useQuery({
    queryKey: ["subjects", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, code, teacher_name, section_id")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useStudents() {
  return useQuery({
    queryKey: ["people", "students"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, section_id, year_level"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as string),
      }));
    },
  });
}

function LessonUpload({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const sections = useSections();
  const subjects = useSubjects();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);

  const lessons = useQuery({
    queryKey: ["lessons", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, lesson_date, file_path, subjects(name)")
        .order("lesson_date", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      let filePath: string | null = null;
      let fileType = "";
      let fileSize = 0;
      if (file) {
        filePath = `${sectionId || "all"}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("lessons").upload(filePath, file);
        if (error) throw error;
        fileType = file.type;
        fileSize = file.size;
      }
      const { error } = await supabase.from("lessons").insert({
        title,
        description,
        subject_id: subjectId || null,
        section_id: sectionId || null,
        lesson_date: lessonDate,
        file_path: filePath,
        file_type: fileType,
        file_size: fileSize,
        uploaded_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson posted — students see it instantly");
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      setTitle("");
      setDescription("");
      setFile(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson removed");
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Post a lesson</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="l-title">Title</Label>
            <Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="l-desc">Description</Label>
            <Textarea
              id="l-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                {(sections.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="l-date">Lesson date</Label>
            <Input
              id="l-date"
              type="date"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="l-file">File</Label>
            <Input
              id="l-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => create.mutate()} disabled={!title || create.isPending}>
              <Upload className="size-4" aria-hidden /> Post lesson
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent lessons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(lessons.data ?? []).map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.title}</p>
                <p className="text-xs text-muted-foreground">
                  {l.subjects?.name ?? "General"} · {formatDate(l.lesson_date)}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(l.id)}>
                <Trash2 className="size-4" aria-hidden />
                <span className="sr-only">Delete lesson</span>
              </Button>
            </div>
          ))}
          {(lessons.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No lessons yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AssignmentForm({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const sections = useSections();
  const subjects = useSubjects();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const assignments = useQuery({
    queryKey: ["assignments", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, title, due_at, subjects(name)")
        .order("due_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assignments").insert({
        title,
        description,
        due_at: dueAt ? new Date(dueAt).toISOString() : new Date().toISOString(),
        max_score: maxScore ? Number(maxScore) : null,
        subject_id: subjectId || null,
        section_id: sectionId || null,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment posted — students get reminded");
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setTitle("");
      setDescription("");
      setDueAt("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New assignment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="a-title">Title</Label>
            <Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="a-desc">Instructions</Label>
            <Textarea
              id="a-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-due">Due</Label>
            <Input
              id="a-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-score">Max score</Label>
            <Input
              id="a-score"
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                {(sections.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => create.mutate()} disabled={!title || create.isPending}>
              <Plus className="size-4" aria-hidden /> Post assignment
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Posted assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(assignments.data ?? []).map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.subjects?.name ?? "General"} · due {formatDate(a.due_at)}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(a.id)}>
                <Trash2 className="size-4" aria-hidden />
                <span className="sr-only">Delete assignment</span>
              </Button>
            </div>
          ))}
          {(assignments.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function ScheduleManager() {
  const queryClient = useQueryClient();
  const students = useStudents();
  const [studentId, setStudentId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [room, setRoom] = useState("");
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:00");

  const rows = useQuery({
    queryKey: ["schedules", "admin", studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("student_id", studentId)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedules").insert({
        student_id: studentId,
        subject_name: subjectName,
        teacher_name: teacherName,
        room,
        day_of_week: Number(day),
        start_time: start,
        end_time: end,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Class added to the student's schedule");
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setSubjectName("");
      setRoom("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add class"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Build a personal schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {(students.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name || s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-subject">Subject</Label>
            <Input
              id="s-subject"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-teacher">Teacher</Label>
            <Input
              id="s-teacher"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-room">Room</Label>
            <Input id="s-room" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Day</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => (
                  <SelectItem key={d} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-start">Start</Label>
            <Input
              id="s-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-end">End</Label>
            <Input id="s-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button
              onClick={() => add.mutate()}
              disabled={!studentId || !subjectName || add.isPending}
            >
              <Plus className="size-4" aria-hidden /> Add class
            </Button>
          </div>
        </CardContent>
      </Card>

      {studentId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(rows.data ?? []).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <span className="w-24 text-xs font-medium text-muted-foreground">
                  {DAYS[r.day_of_week]}
                </span>
                <span className="flex-1 text-sm">
                  {r.subject_name} · {formatTime(r.start_time)}–{formatTime(r.end_time)}
                  {r.room ? ` · ${r.room}` : ""}
                </span>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}>
                  <Trash2 className="size-4" aria-hidden />
                  <span className="sr-only">Remove class</span>
                </Button>
              </div>
            ))}
            {(rows.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No classes yet for this student.</p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function People({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const people = useStudents();
  const sections = useSections();

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "teacher" | "student" }) => {
      const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delError) throw delError;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["people", "students"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update role"),
  });

  const setSection = useMutation({
    mutationFn: async ({ userId, sectionId }: { userId: string; sectionId: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ section_id: sectionId })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Section updated");
      queryClient.invalidateQueries({ queryKey: ["people", "students"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update section"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">People</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(people.data ?? []).map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.full_name || "Unnamed"}</p>
              <p className="truncate text-xs text-muted-foreground">{p.email}</p>
            </div>
            {p.roles.map((r) => (
              <Badge key={r} variant="secondary" className="capitalize">
                {r}
              </Badge>
            ))}
            <Select
              value={p.section_id ?? ""}
              onValueChange={(v) => setSection.mutate({ userId: p.id, sectionId: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                {(sections.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select
                onValueChange={(v) =>
                  setRole.mutate({ userId: p.id, role: v as "admin" | "teacher" | "student" })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Set role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
        {(people.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No accounts yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Setup() {
  const queryClient = useQueryClient();
  const sections = useSections();
  const subjects = useSubjects();
  const [sectionName, setSectionName] = useState("");
  const [sectionYear, setSectionYear] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectTeacher, setSubjectTeacher] = useState("");
  const [subjectSection, setSubjectSection] = useState("");

  const addSection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("sections")
        .insert({ name: sectionName, year_level: sectionYear });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Section created");
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      setSectionName("");
      setSectionYear("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create section"),
  });

  const addSubject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").insert({
        name: subjectName,
        code: subjectCode,
        teacher_name: subjectTeacher,
        section_id: subjectSection || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject created");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setSubjectName("");
      setSubjectCode("");
      setSubjectTeacher("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create subject"),
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sec-name">Name</Label>
            <Input
              id="sec-name"
              placeholder="e.g. 10 - Rizal"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sec-year">Year level</Label>
            <Input
              id="sec-year"
              placeholder="e.g. Grade 10"
              value={sectionYear}
              onChange={(e) => setSectionYear(e.target.value)}
            />
          </div>
          <Button onClick={() => addSection.mutate()} disabled={!sectionName}>
            <Plus className="size-4" aria-hidden /> Add section
          </Button>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {(sections.data ?? []).map((s) => (
              <li key={s.id}>
                {s.name} {s.year_level ? `· ${s.year_level}` : ""}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subjects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sub-name">Name</Label>
            <Input
              id="sub-name"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-code">Code</Label>
            <Input
              id="sub-code"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-teacher">Teacher</Label>
            <Input
              id="sub-teacher"
              value={subjectTeacher}
              onChange={(e) => setSubjectTeacher(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={subjectSection} onValueChange={setSubjectSection}>
              <SelectTrigger>
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                {(sections.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => addSubject.mutate()} disabled={!subjectName}>
            <Plus className="size-4" aria-hidden /> Add subject
          </Button>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {(subjects.data ?? []).map((s) => (
              <li key={s.id}>
                {s.name} {s.teacher_name ? `· ${s.teacher_name}` : ""}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
