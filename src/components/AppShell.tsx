import { ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Calendar,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ScrollText,
  Settings,
  BookOpen,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { AddToHomeBanner } from "@/components/AddToHomeBanner";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const studentNav: NavItem[] = [
  { to: "/student", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: "/student/lessons", label: "Lessons", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/student/schedule", label: "Schedule", icon: <Calendar className="h-4 w-4" /> },
  { to: "/student/assignments", label: "Assignments", icon: <ScrollText className="h-4 w-4" /> },
  { to: "/student/attendance", label: "Attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
  { to: "/student/chat", label: "Chat", icon: <MessageSquare className="h-4 w-4" /> },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: "/admin/students", label: "Students", icon: <Users className="h-4 w-4" /> },
  { to: "/admin/lessons", label: "Lessons", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/admin/schedule", label: "Schedule", icon: <Calendar className="h-4 w-4" /> },
  { to: "/admin/assignments", label: "Assignments", icon: <ScrollText className="h-4 w-4" /> },
  { to: "/admin/attendance", label: "Attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
  { to: "/admin/chat", label: "Chat", icon: <MessageSquare className="h-4 w-4" /> },
];

export function AppShell({ children }: AppShellProps) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const nav = isAdmin ? adminNav : studentNav;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  const displayName = profile?.full_name ?? user?.email ?? "User";
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Mount the realtime listener once per logged-in session. The hook itself
  // subscribes to several tables and pops a toast on every change.
  useRealtimeNotifications();

  return (
    <div className="min-h-screen bg-muted/30 md:grid md:grid-cols-[260px_1fr]">
      <AddToHomeBanner />

      {/* Mobile overlay, shown behind the drawer while it's open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground flex flex-col",
          // Mobile: fixed drawer, off-canvas by default, slides in when open
          "fixed inset-y-0 left-0 z-50 w-72 -translate-x-full transition-transform duration-200 ease-out",
          sidebarOpen && "translate-x-0",
          // Desktop: back to a normal static column, no transform/overlay
          "md:static md:z-auto md:w-auto md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            {/* RTU diamond logo next to "ClassDesk" in both the
                admin and student sidebars. */}
            <Logo rounded size={36} />
            <div className="flex flex-col">
              <span className="font-display text-base font-semibold leading-tight">RTU-BSOA</span>
              <span className="text-xs text-sidebar-foreground/70">
                {isAdmin ? "Admin portal" : "Student portal"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-semibold">
              {initials || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-muted-foreground">
              <Link to={isAdmin ? "/admin" : "/student"} className="hover:text-foreground">
                {isAdmin ? "Admin" : "Student"} portal
              </Link>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <Settings className="h-4 w-4" />
            <span>v0.1.0</span>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}