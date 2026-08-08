import { supabase } from "@/integrations/supabase/client";

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatTime(value: string) {
  const [h, m] = value.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m ?? "00"} ${suffix}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "No due date";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fileKind(fileType: string, path?: string | null) {
  const t = `${fileType} ${path ?? ""}`.toLowerCase();
  if (t.includes("pdf")) return "PDF";
  if (t.includes("video") || t.includes("mp4") || t.includes("mov")) return "Video";
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg"))
    return "Image";
  if (t.includes("presentation") || t.includes("ppt")) return "Slides";
  if (t.includes("word") || t.includes("doc")) return "Document";
  if (t.includes("sheet") || t.includes("xls") || t.includes("csv")) return "Sheet";
  return "File";
}

export function formatSize(bytes: number) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Opens a private storage file through a short-lived signed URL. */
export async function openStorageFile(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (error || !data) throw error ?? new Error("Could not open file");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export function relativeDueLabel(due: string | null | undefined) {
  if (!due) return { label: "No due date", tone: "muted" as const };
  const diff = new Date(due).getTime() - Date.now();
  const hours = diff / 3_600_000;
  if (diff < 0) return { label: "Overdue", tone: "danger" as const };
  if (hours < 1) return { label: `Due in ${Math.max(1, Math.round(diff / 60_000))} min`, tone: "danger" as const };
  if (hours < 24) return { label: `Due in ${Math.round(hours)}h`, tone: "warning" as const };
  return { label: `Due ${formatDate(due)}`, tone: "muted" as const };
}
