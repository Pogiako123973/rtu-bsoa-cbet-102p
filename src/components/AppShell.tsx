import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  Home,
  ListChecks,
  LogOut,
  Shield,
  User,
  GraduationCap,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { data: me } = useMe();
  const signOut = useSignOut();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-10">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/home" className="flex items-center gap-2 font-display font-semibold">
            <GraduationCap className="size-5" aria-hidden />
            ClassDesk
          </Link>
          <div className="flex items-center gap-2">
            {me?.isAdmin && (
              <Button asChild size="sm" variant="secondary">
                <Link to="/admin">
                  <Shield className="size-4" aria-hidden /> Admin
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={signOut}
              className="text-primary-foreground hover:bg-primary-foreground/15"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>

        <nav className="mx-auto hidden max-w-5xl gap-1 px-5 pb-3 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.to
                  ? "bg-primary-foreground/20"
                  : "opacity-80 hover:bg-primary-foreground/10",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6 space-y-6">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 backdrop-blur sm:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              pathname === item.to ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
