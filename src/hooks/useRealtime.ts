import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to live table changes and refreshes the given query keys.
 * onInsert lets a page show a toast for newly published rows.
 */
export function useRealtime(
  table: "lessons" | "schedules" | "assignments" | "todos",
  queryKeys: string[][],
  onInsert?: (row: Record<string, unknown>) => void,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
        if (payload.eventType === "INSERT" && onInsert) {
          onInsert(payload.new as Record<string, unknown>);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, JSON.stringify(queryKeys)]);
}
