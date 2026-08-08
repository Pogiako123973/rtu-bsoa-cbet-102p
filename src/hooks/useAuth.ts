import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "student";

export type Me = {
  userId: string;
  email: string;
  profile: {
    id: string;
    full_name: string;
    email: string;
    section_id: string | null;
    year_level: string;
    avatar_url: string | null;
  } | null;
  roles: AppRole[];
  isAdmin: boolean;
  isTeacher: boolean;
  isStaff: boolean;
};

export function useMe() {
  return useQuery<Me | null>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, section_id, year_level, avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const roles = (roleRows ?? []).map((r) => r.role as AppRole);
      return {
        userId: user.id,
        email: user.email ?? "",
        profile: profile ?? null,
        roles,
        isAdmin: roles.includes("admin"),
        isTeacher: roles.includes("teacher"),
        isStaff: roles.includes("admin") || roles.includes("teacher"),
      };
    },
    staleTime: 30_000,
  });
}