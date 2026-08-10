import { useSyncExternalStore } from "react";

export interface ActivityItem {
  id: string;
  kind: "lesson" | "schedule";
  title: string;
  detail: string;
  at: number;
  /** The real row id (lesson.id / schedule.id) so the feed can deep-link to it. */
  refId?: string;
}

const MAX_ITEMS = 15;
const STORAGE_KEY = "classdesk:activity-feed";

// Module-level state so this persists across page navigation (a page-local
// useState would reset every time the user navigates away and back). We
// also mirror it into sessionStorage so a full page *reload* — not just
// in-app navigation — doesn't wipe the feed either. sessionStorage (not
// localStorage) is used on purpose: it clears when the tab actually
// closes, so the feed doesn't grow stale across days-old sessions.
function loadInitial(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let items: ActivityItem[] = loadInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable (e.g. private browsing) — feed still
    // works in-memory for the rest of the session, just won't survive reload
  }
}

export function pushActivity(item: Omit<ActivityItem, "id" | "at">) {
  items = [{ ...item, id: crypto.randomUUID(), at: Date.now() }, ...items].slice(0, MAX_ITEMS);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return items;
}

export function useActivityFeed(): ActivityItem[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}