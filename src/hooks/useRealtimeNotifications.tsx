import { useEffect } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  ClipboardList,
  Inbox,
  MessageSquare,
} from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useAuth } from "@/hooks/useAuth";

/**
 * Mount this once near the top of the app (anywhere inside AppShell). It
 * subscribes to the realtime stream and pops a toast whenever a row the
 * current user cares about changes.
 *
 * It also broadcasts a `classdesk:data-changed` window event with the table
 * name in `detail.table`, so individual pages can refetch their own lists
 * without us having to wire each one through React context.
 *
 * IMPORTANT: the Supabase project must have realtime enabled for each
 * tracked table. Run this once in the Supabase SQL editor:
 *
 *   alter publication supabase_realtime add table assignments;
 *   alter publication supabase_realtime add table schedules;
 *   alter publication supabase_realtime add table chat_messages;
 *   alter publication supabase_realtime add table lessons;
 *   alter publication supabase_realtime add table attendance;
 */
export function useRealtimeNotifications() {
  const { profile, user } = useAuth();

  function broadcast(table: string) {
    window.dispatchEvent(
      new CustomEvent("classdesk:data-changed", { detail: { table } }),
    );
  }

  // ---------- Assignments ----------
  useRealtimeTable({
    table: "assignments",
    events: ["INSERT"],
    onChange: (payload) => {
      const row = payload.new as { title?: string; subject?: string };
      toast.success("New assignment posted", {
        description: `${row.subject ?? ""} — ${row.title ?? ""}`,
        icon: <ClipboardList className="h-4 w-4" />,
        duration: 6000,
      });
      broadcast("assignments");
    },
  });

  useRealtimeTable({
    table: "assignments",
    events: ["DELETE"],
    onChange: () => broadcast("assignments"),
  });

  // ---------- Schedule ----------
  useRealtimeTable({
    table: "schedules",
    events: ["INSERT", "UPDATE"],
    onChange: (payload) => {
      const row = payload.new as { subject?: string };
      if (payload.eventType === "INSERT") {
        toast("Schedule updated", {
          description: `New class added: ${row.subject ?? ""}`,
          icon: <CalendarPlus className="h-4 w-4" />,
          duration: 5000,
        });
      }
      broadcast("schedule");
    },
  });

  // ---------- Messages ----------
  useRealtimeTable({
    table: "chat_messages",
    events: ["INSERT"],
    onChange: (payload) => {
      const row = payload.new as { sender_id?: string; content?: string };
      if (user && row.sender_id === user.id) {
        broadcast("messages");
        return;
      }
      toast.message("New message", {
        description: (row.content ?? "").slice(0, 80),
        icon: <MessageSquare className="h-4 w-4" />,
        duration: 4000,
      });
      broadcast("messages");
    },
  });

  // ---------- Lessons ----------
  useRealtimeTable({
    table: "lessons",
    events: ["INSERT"],
    onChange: (payload) => {
      const row = payload.new as { title?: string };
      toast("New lesson published", {
        description: row.title ?? "",
        icon: <Inbox className="h-4 w-4" />,
        duration: 5000,
      });
      broadcast("lessons");
    },
  });

  // ---------- Attendance ----------
  useRealtimeTable({
    table: "attendance",
    events: ["INSERT", "UPDATE"],
    onChange: () => broadcast("attendance"),
  });

  useEffect(() => {
    if (import.meta.env.DEV && profile) {
      // eslint-disable-next-line no-console
      console.info("[realtime] Listening for changes as", profile.role, profile.email);
    }
  }, [profile]);
}
