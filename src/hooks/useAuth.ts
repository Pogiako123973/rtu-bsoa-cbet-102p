import { useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, type Profile, type AppRole } from "@/lib/supabase";

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    // Initial session load
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!mounted) return;
      if (!session) {
        setState({
          session: null,
          user: null,
          profile: null,
          role: null,
          loading: false,
        });
        return;
      }
      const profile = await fetchProfile(session.user.id);
      if (!mounted) return;
      setState({
        session,
        user: session.user,
        profile,
        role: profile?.role ?? null,
        loading: false,
      });
    });

    // Subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (!session) {
        setState({
          session: null,
          user: null,
          profile: null,
          role: null,
          loading: false,
        });
        return;
      }
      const profile = await fetchProfile(session.user.id);
      if (!mounted) return;
      setState({
        session,
        user: session.user,
        profile,
        role: profile?.role ?? null,
        loading: false,
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  }

  async function signUp(args: {
    email: string;
    password: string;
    fullName: string;
    studentId?: string;
    role?: AppRole;
  }) {
    const { email, password, fullName, studentId, role } = args;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          student_id: studentId,
          role: role ?? "student",
        },
      },
    });
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { ...state, signIn, signUp, signOut };
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[auth] failed to fetch profile:", error.message);
    return null;
  }
  return data ?? null;
}
