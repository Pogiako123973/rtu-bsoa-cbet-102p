import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/useRealtime";
import { fileKind, formatDate, formatSize, openStorageFile } from "@/lib/school";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/lessons")({
  head: () => ({
    meta: [
      { title: "Lessons — ClassDesk" },
      { name: "description", content: "Browse and download lesson files for your subjects." },
      { property: "og:title", content: "Lessons — ClassDesk" },
      { property: "og:description", content: "Lesson files by subject, date and week." },
    ],
  }),
  component: LessonsPage,
});

function LessonsPage() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [period, setPeriod] = useState("all");

  const subjects = useQuery({
    queryKey: ["subjects", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const lessons = useQuery({
    queryKey: ["lessons", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "id, title, description, file_path, file_type, file_size, lesson_date, created_at, subject_id, subjects(name)",
        )
        .eq("is_archived", false)
        .order("lesson_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useRealtime("lessons", [["lessons", "list"]], (row) =>
    toast.success(`New lesson posted: ${String(row["title"] ?? "")}`),
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    return (lessons.data ?? []).filter((l) => {
      if (subject !== "all" && l.subject_id !== subject) return false;
      if (search && !`${l.title} ${l.description}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (period !== "all") {
        const days = period === "week" ? 7 : period === "month" ? 30 : 1;
        if (new Date(l.lesson_date).getTime() < now - days * 86_400_000) return false;
      }
      return true;
    });
  }, [lessons.data, subject, search, period]);

  async function open(path: string | null) {
    if (!path) {
      toast.error("This lesson has no attached file");
      return;
    }
    try {
      await openStorageFile("lessons", path);
    } catch {
      toast.error("Could not open the file");
    }
  }

  return (
    <AppShell title="Lessons" subtitle="Files posted for your subjects">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lesson titles"
            className="pl-9"
          />
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {(subjects.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any date</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lessons.isLoading && <p className="text-sm text-muted-foreground">Loading lessons…</p>}

      {!lessons.isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium">No lessons found</p>
            <p className="text-sm text-muted-foreground">
              Try a different subject or date filter.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {filtered.map((l) => (
          <Card key={l.id} className="shadow-soft transition-shadow hover:shadow-lift">
            <CardContent className="flex flex-wrap items-center gap-4 py-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{l.title}</p>
                  <Badge variant="secondary">{fileKind(l.file_type, l.file_path)}</Badge>
                </div>
                {l.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {l.subjects?.name ?? "General"} · {formatDate(l.lesson_date)}
                  {l.file_size ? ` · ${formatSize(l.file_size)}` : ""}
                </p>
              </div>
              <Button size="sm" onClick={() => open(l.file_path)}>
                <Download className="size-4" aria-hidden /> Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
