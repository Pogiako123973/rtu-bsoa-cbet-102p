import { supabase } from "@/lib/supabase";

export type LessonAttachment =
  | {
      kind: "file";
      path: string;
      name: string;
      type: string;
      size: number;
    }
  | {
      kind: "link";
      url: string;
      name: string;
    };

function legacyAttachment(l: any): LessonAttachment | null {
  if (!l.attachment_path) return null;
  return {
    kind: "file",
    path: l.attachment_path,
    name: l.attachment_name ?? l.attachment_path,
    type: l.attachment_type ?? "application/octet-stream",
    size: l.attachment_size ?? 0,
  };
}

export function lessonAttachments(l: Lesson): LessonAttachment[] {
  const raw = (l as any).attachments as LessonAttachment[] | null | undefined;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  const legacy = legacyAttachment(l);
  return legacy ? [legacy] : [];
}

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  content: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  attachments: LessonAttachment[];
  attachment_texts: Record<string, string>;
  created_by: string | null;
  created_at: string;
}

export interface ScheduleEntry {
  id: string;
  student_id: string | null; // null = applies to all students
  subject: string;
  day_of_week: number; // 0..6 (Sun..Sat)
  start_time: string; // "HH:MM"
  end_time: string;
  room: string | null;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  created_by: string | null;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  status: "submitted" | "graded";
  submitted_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  schedule_id: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "late";
}

export interface ChatMessage {
  id: string;
  room: string;
  sender_id: string;
  content: string;
  created_at: string;
}

/* ---------------- Lessons ---------------- */
export async function listLessons(): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lesson[];
}

export async function createLesson(input: {
  title: string;
  subject: string;
  content: string;
  created_by: string;
  attachments: LessonAttachment[];
  attachment_texts?: Record<string, string>;
}): Promise<Lesson> {
  const primary = input.attachments.find((a) => a.kind === "file");
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      title: input.title.trim(),
      subject: input.subject.trim(),
      content: input.content.trim(),
      created_by: input.created_by,
      attachments: input.attachments,
      attachment_texts: input.attachment_texts ?? {},
      // Keep the legacy columns in sync for back-compat readers.
      attachment_path: primary?.kind === "file" ? primary.path : null,
      attachment_name: primary?.kind === "file" ? primary.name : null,
      attachment_type: primary?.kind === "file" ? primary.type : null,
      attachment_size: primary?.kind === "file" ? primary.size : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Lesson;
}

/**
 * Back-compat client-side search, kept so other pages that still
 * import `searchLessons` (e.g. a student-facing lessons view) don't
 * break. Matches title/subject/content only — it does NOT search
 * inside attachment text, since that requires the async storage
 * download handled in AdminLessons.tsx's `extraTexts` backfill. If a
 * page needs file-content search too, port the same `attachText`/
 * `fetchAttachmentText` approach used there instead of calling this.
 */
export async function searchLessons(query: string): Promise<Lesson[]> {
  const q = query.trim().toLowerCase();
  const all = await listLessons();
  if (!q) return all;
  return all.filter((l) =>
    [l.title, l.subject, l.content].join(" ").toLowerCase().includes(q),
  );
}

export async function deleteLesson(id: string): Promise<void> {
  // Best-effort: gather attachment paths first so we can clean storage.
  const { data } = await supabase
    .from("lessons")
    .select("attachments, attachment_path")
    .eq("id", id)
    .maybeSingle();
  const atts = data
    ? lessonAttachments(data as unknown as Lesson)
    : [];
  const filePaths = atts
    .filter((a): a is Extract<LessonAttachment, { kind: "file" }> => a.kind === "file")
    .map((a) => a.path);
  // Skip the legacy path if it's already covered by the attachments array.
  const legacy = (data as any)?.attachment_path as string | null;
  if (legacy && !filePaths.includes(legacy)) filePaths.push(legacy);

  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw error;
  if (filePaths.length > 0) {
    await Promise.allSettled(filePaths.map((p) => deleteLessonFile(p)));
  }
}

/**
 * Upload a file to the `lesson-files` bucket under a unique path.
 * Returns the storage path (not a public URL — bucket is private).
 */
export async function uploadLessonFile(file: File): Promise<{
  path: string;
  name: string;
  type: string;
  size: number;
}> {
  const ext = file.name.includes(".") ? (file.name.split(".").pop() ?? "bin") : "bin";
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
  const path = `${crypto.randomUUID()}.${safeExt}`;
  const { error } = await supabase.storage
    .from("lesson-files")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { path, name: file.name, type: file.type, size: file.size };
}

/** Get a short-lived signed URL for a private attachment (1 hour). */
export async function getLessonFileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("lesson-files")
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/** Best-effort delete; ignores missing-file errors. */
export async function deleteLessonFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from("lesson-files").remove([path]);
  // ignore "not found" since the row may already be gone
  if (error && !/not\s*found/i.test(error.message)) throw error;
}

/**
 * Find a file inside the `lesson-files` bucket by its bare filename.
 * Used by chat to resolve messages whose content is just an uploaded
 * filename. Returns the storage path + a short-lived signed URL, or
 * `null` when no matching object exists.
 */
export async function findLessonFileByName(name: string): Promise<{
  path: string;
  url: string;
  type: string | null;
  size: number | null;
} | null> {
  const trimmed = name.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return null;
  // List the bucket; the folder structure is shallow, so a single page
  // is enough in practice for class-sized uploads.
  const { data, error } = await supabase.storage
    .from("lesson-files")
    .list("", { limit: 1000, search: trimmed });
  if (error) return null;
  const match = (data ?? []).find(
    (o) => o.name === trimmed || o.name === decodeURIComponent(trimmed),
  );
  if (!match) return null;
  const { data: signed, error: signErr } = await supabase.storage
    .from("lesson-files")
    .createSignedUrl(match.name, 60 * 60);
  if (signErr || !signed) return null;
  return {
    path: match.name,
    url: signed.signedUrl,
    type: (match.metadata?.mimetype as string | undefined) ?? null,
    size: match.metadata?.size ?? null,
  };
}

// Same "is this readable as text" rules as the upload-time indexer in
// AdminLessons.tsx, so the two stay consistent about what gets read.
const TEXT_MIME = [
  /^text\//,
  /application\/(json|xml|ld\+json|yaml|x-yaml|plain)$/,
];
const TEXT_EXT =
  /\.(md|markdown|txt|csv|json|ya?ml|xml|log|ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|c|cpp|h|hpp|cs|rb|php|sh|bash|sql|html|htm|css|scss|sass|less|env|ini|conf|gradle|kt|swift|dart|toml|lock)$/i;

export function isTextLikeAttachment(name: string, type?: string | null): boolean {
  if (type && TEXT_MIME.some((rx) => rx.test(type))) return true;
  return TEXT_EXT.test(name);
}

/**
 * Download a private attachment from storage and read it as text, so
 * search can reach *inside* files whose text was never captured at
 * upload time (legacy lessons, or uploads where extraction was
 * skipped/failed). Non-text files and oversized files are skipped —
 * same 1.5MB / 200k-char caps as the upload-time extraction, so a
 * search backfill pass stays cheap.
 */
export async function fetchAttachmentText(
  path: string,
  name: string,
  type?: string | null,
): Promise<string | null> {
  if (!isTextLikeAttachment(name, type)) return null;
  const { data, error } = await supabase.storage.from("lesson-files").download(path);
  if (error || !data) {
    // eslint-disable-next-line no-console
    console.warn(`[lessons] failed to backfill search text for "${name}" (${path}):`, error);
    return null;
  }
  if (data.size > 1.5 * 1024 * 1024) {
    // eslint-disable-next-line no-console
    console.warn(`[lessons] skipping search backfill for "${name}": file too large (${data.size} bytes)`);
    return null;
  }
  try {
    const t = await data.text();
    return t.length > 200_000 ? t.slice(0, 200_000) : t;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[lessons] failed to read "${name}" as text:`, e);
    return null;
  }
}

/* ---------------- Schedule ---------------- */
export async function listSchedule(): Promise<ScheduleEntry[]> {
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScheduleEntry[];
}

export async function createScheduleEntry(input: Omit<ScheduleEntry, "id">): Promise<ScheduleEntry> {
  const { data, error } = await supabase.from("schedules").insert(input).select().single();
  if (error) throw error;
  return data as ScheduleEntry;
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Students (admin) ---------------- */
export interface StudentLite {
  id: string;
  email: string;
  full_name: string | null;
  student_id: string | null;
  created_at: string;
}

export async function listStudents(): Promise<StudentLite[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, student_id, created_at")
    .eq("role", "student")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StudentLite[];
}

/* ---------------- Assignments ---------------- */
export async function listAssignments(): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Assignment[];
}

export async function createAssignment(input: {
  title: string;
  description: string;
  subject: string;
  due_date: string;
  created_by: string;
}): Promise<Assignment> {
  const { data, error } = await supabase.from("assignments").insert(input).select().single();
  if (error) throw error;
  return data as Assignment;
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw error;
}

export async function listMySubmissions(studentId: string): Promise<AssignmentSubmission[]> {
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AssignmentSubmission[];
}

/** Admin: list all submissions for a single assignment. */
export async function listStudentSubmissions(assignmentId: string): Promise<AssignmentSubmission[]> {
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AssignmentSubmission[];
}

export async function submitAssignment(input: {
  assignment_id: string;
  student_id: string;
  content: string;
}): Promise<AssignmentSubmission> {
  const { data, error } = await supabase
    .from("assignment_submissions")
    .insert({ ...input, status: "submitted" })
    .select()
    .single();
  if (error) throw error;
  return data as AssignmentSubmission;
}

/* ---------------- Attendance ---------------- */
export async function listMyAttendance(studentId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AttendanceRecord[];
}

export async function markAttendance(input: {
  student_id: string;
  schedule_id: string;
  date: string;
  status: AttendanceRecord["status"];
}): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from("attendance")
    .upsert(input, { onConflict: "student_id,schedule_id,date" })
    .select()
    .single();
  if (error) throw error;
  return data as AttendanceRecord;
}

/* ---------------- Chat ---------------- */
export async function listMessages(room = "general", limit = 200): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("room", room)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function sendMessage(input: {
  room: string;
  sender_id: string;
  content: string;
}): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

export function subscribeMessages(
  room: string,
  onNew: (msg: ChatMessage) => void
): () => void {
  const channel = supabase
    .channel(`chat:${room}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `room=eq.${room}` },
      (payload) => onNew(payload.new as ChatMessage)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}