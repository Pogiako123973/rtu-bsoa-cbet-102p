import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Hash } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  listMessages,
  sendMessage,
  subscribeMessages,
  type ChatMessage,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { FileMessage, InlineMarkdown, looksLikeFilename } from "@/components/chat/FileMessage";

export default function StudentChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listMessages("general")
      .then(setMessages)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
    const off = subscribeMessages("general", (m) =>
      setMessages((prev) => [...prev, m]),
    );
    return off;
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  const grouped = useMemo(() => groupByDay(messages), [messages]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      const m = await sendMessage({ room: "general", sender_id: user.id, content });
      setMessages((prev) => [...prev, m]);
      setText("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chat"
        description="Talk with everyone in the school."
      />

      <Card className="relative flex h-[68vh] min-h-[520px] flex-col overflow-hidden border-0 shadow-lift">
        {/* Decorative gradient bar */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1.5"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.75 0.16 200), oklch(0.78 0.15 175), oklch(0.85 0.14 150))",
          }}
        />
        <CardContent className="flex flex-1 flex-col gap-0 p-0">
          {/* Room header */}
          <div className="flex items-center gap-3 border-b bg-gradient-to-b from-card to-card/60 px-5 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400/25 to-emerald-300/20 ring-1 ring-white/15">
              <Hash className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold leading-tight">
                #general
              </p>
              <p className="text-[11px] text-muted-foreground">
                Everyone in BSOA-CBET-25-102P
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-300/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              live
            </span>
          </div>

          {/* Messages */}
          <div
            ref={scroller}
            className="flex-1 space-y-5 overflow-y-auto bg-background/40 px-4 py-5 sm:px-6"
          >
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
              </div>
            ) : messages.length === 0 ? (
              <EmptyChat />
            ) : (
              grouped.map(({ day, items }) => (
                <div key={day}>
                  <DayDivider label={day} />
                  <div className="mt-3 space-y-2.5">
                    {items.map((m) => (
                      <Bubble key={m.id} m={m} mine={m.sender_id === user?.id} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={onSend}
            className="flex items-center gap-2 border-t bg-card/80 px-3 py-3 backdrop-blur"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              disabled={sending}
              className="h-10 bg-background/70"
            />
            <Button
              type="submit"
              disabled={sending || !text.trim()}
              className="h-10 px-4"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- bits ---------- */

function Bubble({ m, mine }: { m: ChatMessage; mine: boolean }) {
  const time = new Date(m.created_at);
  const asFile = looksLikeFilename(m.content);
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-soft",
          mine
            ? "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {asFile ? (
          <FileMessage filename={m.content.trim()} />
        ) : (
          <InlineMarkdown text={m.content} />
        )}
        <p
          className={cn(
            "mt-1 text-right text-[10px]",
            mine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan-400/20 to-emerald-300/20 ring-1 ring-white/15">
        <Hash className="h-5 w-5 text-foreground" />
      </div>
      <p className="font-display text-base">No messages yet</p>
      <p className="text-sm text-muted-foreground">
        Say hi to your section.
      </p>
    </div>
  );
}

function groupByDay(messages: ChatMessage[]): {
  day: string;
  items: ChatMessage[];
}[] {
  const out: { day: string; items: ChatMessage[] }[] = [];
  let cur = "";
  for (const m of messages) {
    const d = new Date(m.created_at);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const label = sameDay
      ? "Today"
      : isYesterday
        ? "Yesterday"
        : d.toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
    if (label !== cur) {
      out.push({ day: label, items: [] });
      cur = label;
    }
    out[out.length - 1].items.push(m);
  }
  return out;
}
