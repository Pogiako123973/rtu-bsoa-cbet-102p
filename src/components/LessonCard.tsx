import { useEffect, useState } from "react";
import {
  Eye,
  FileSpreadsheet,
  FileText,
  FileType,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getLessonFileUrl,
  lessonAttachments,
  type Lesson,
  type LessonAttachment,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * A lesson card with a blurred image background and aligned row heights.
 *
 * Layout per card (CSS grid):
 *   row 1 (auto)  -> header:  title / subject / date
 *   row 2 (1fr)   -> body:    content + (optional) attachment chips
 *   row 3 (auto)  -> footer:  action button (right-aligned)
 *
 * The grid container is `items-stretch` so every card in a row matches
 * the tallest card's height automatically — no manual min-h, no JS.
 *
 * When ANY attachment is an image, it's loaded, scaled to cover, blurred,
 * faded, and laid behind a translucent overlay so the foreground text stays
 * legible. Non-image lessons fall back to the design-system gradient panel.
 */
export function LessonCard({
  lesson,
  onView,
  onDelete,
  className,
}: {
  lesson: Lesson;
  onView: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  const atts = lessonAttachments(lesson);
  const firstImage = atts.find(
    (a): a is Extract<LessonAttachment, { kind: "file" }> =>
      a.kind === "file" && a.type.startsWith("image/"),
  );
  const hasAny = atts.length > 0;

  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgErr, setBgErr] = useState(false);

  useEffect(() => {
    if (!firstImage) {
      setBgUrl(null);
      setBgErr(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await getLessonFileUrl(firstImage.path);
        if (!cancelled) setBgUrl(u);
      } catch {
        if (!cancelled) setBgErr(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firstImage?.path]);

  // Show up to 3 chips, then a "+N" indicator.
  const visibleChips = atts.slice(0, 3);
  const overflow = atts.length - visibleChips.length;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0 bg-transparent shadow-soft",
        "min-h-72",
        className,
      )}
    >
      {/* Background layer — image (blurred) or fallback gradient. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {firstImage && bgUrl && !bgErr ? (
          <>
            <img
              src={bgUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{
                filter: "blur(22px) saturate(1.2) brightness(0.7)",
                transform: "scale(1.15)",
              }}
              loading="lazy"
              draggable={false}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, oklch(0.42 0.09 215 / 0.22) 0%, oklch(0.58 0.1 175 / 0.18) 100%)",
              }}
            />
            <div className="absolute inset-0 bg-background/40" />
          </>
        ) : (
          <div className="h-full w-full bg-panel" />
        )}
        <div
          className="absolute inset-0 rounded-[inherit] ring-1 ring-inset"
          style={{ boxShadow: "inset 0 0 0 1px var(--color-border)" }}
        />
      </div>

      <div className="grid h-full min-h-72 grid-rows-[auto_1fr_auto]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="font-display text-base leading-tight">
                {lesson.title}
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(lesson.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary">{lesson.subject}</Badge>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-2 pb-3">
          <p className="line-clamp-4 whitespace-pre-line text-sm text-foreground/85">
            {lesson.content}
          </p>
          {hasAny && (
            <div className="mt-auto flex flex-wrap items-center gap-1.5">
              {visibleChips.map((a, i) => (
                <AttachmentChip key={i} attachment={a} />
              ))}
              {overflow > 0 && (
                <span className="inline-flex items-center rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
                  +{overflow}
                </span>
              )}
            </div>
          )}
        </CardContent>

        <div className="flex items-center justify-end gap-2 border-t border-border/40 bg-background/55 px-6 py-3 backdrop-blur-sm">
          {hasAny && (
            <span className="mr-auto text-[10px] uppercase tracking-wider text-muted-foreground">
              {atts.length} {atts.length === 1 ? "attachment" : "attachments"}
            </span>
          )}
          <Button size="sm" variant="default" onClick={onView}>
            <Eye className="mr-2 h-3.5 w-3.5" />
            View
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AttachmentChip({ attachment }: { attachment: LessonAttachment }) {
  const Icon = attachmentChipIcon(attachment);
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80 backdrop-blur-sm"
      title={attachment.name}
    >
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{attachment.name}</span>
    </span>
  );
}

function attachmentChipIcon(a: LessonAttachment) {
  if (a.kind === "link") return LinkIcon;
  if (a.type.startsWith("image/")) return ImageIcon;
  if (a.type === "application/pdf") return FileText;
  if (a.type.includes("spreadsheet") || a.type.includes("excel"))
    return FileSpreadsheet;
  if (a.type.includes("word") || a.type.includes("presentation"))
    return FileType;
  return FileText;
}
