import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const key =
  anonKey && anonKey.startsWith("eyJ") ? anonKey : publishableKey;

export const supabaseConfigured = Boolean(url && key);

if (!supabaseConfigured) {
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY. " +
      "Add them to your .env file and restart the dev server."
  );
}

export const supabase: SupabaseClient = createClient(
  url || "http://localhost",
  key || "public-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);

export type AppRole = "student" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  student_id: string | null;
  created_at: string;
}