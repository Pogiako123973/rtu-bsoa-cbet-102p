import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

/** Event types for postgres_changes payloads. */
export type ChangeType = "INSERT" | "UPDATE" | "DELETE";

interface UseRealtimeTableOptions {
  /** Supabase table to subscribe to. */
  table: string;
  /** Which change events to react to. Defaults to all three. */
  events?: ChangeType[];
  /** Optional filter, e.g. `subject=eq.Math`. Mirrors the URL filter syntax. */
  filter?: string;
  /**
   * Called for every matching change. The full new row is on `payload.new`,
   * the old row on `payload.old`. For DELETE events `new` is empty.
   * Cast `payload` to your row type for typed access.
   */
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  /** Set false to skip subscribing (useful for conditional listeners). */
  enabled?: boolean;
}

/**
 * Subscribe to postgres_changes on a single table. Cleans up on unmount.
 * Re-subscribes whenever the table/filter/events/enabled change.
 *
 * Requires the table to have `REPLICA IDENTITY FULL` set (for UPDATE/DELETE
 * old rows) and to be in the `supabase_realtime` publication. Run in the
 * Supabase SQL editor if you haven't:
 *   alter table assignments replica identity full;
 *   alter publication supabase_realtime add table assignments;
 */
// Note: we deliberately keep this hook non-generic so it can be called from
// .tsx files without TSX parsing the `<T>` as a JSX tag. Callers cast the
// payload to their own row type, e.g.
//   useRealtimeTable({
//     table: "assignments",
//     onChange: (p) => { const row = p.new as Assignment; ... },
//   });
export function useRealtimeTable(options: UseRealtimeTableOptions): void {
  const { table, events = ["INSERT", "UPDATE", "DELETE"], filter, onChange, enabled = true } = options;

  const handlerRef = useRef(onChange);
  useEffect(() => {
    handlerRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;
    const channel: RealtimeChannel = supabase
      .channel(`realtime:${table}:${filter ?? ""}:${events.slice().sort().join(",")}`)
      .on(
        "postgres_changes" as any,
        {
          event: events.join(",") as any,
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          handlerRef.current(payload);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, events.join(","), enabled]);
}
