import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/lib/supabase";

interface ProtectedRouteProps {
  children: ReactNode;
  /** If set, the user must have one of these roles. */
  roles?: AppRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If we have a session but no profile row yet, give the auth hook a moment to
  // finish its async profile lookup before deciding this is a role mismatch.
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Setting up your account…
      </div>
    );
  }

  if (roles && !roles.includes(profile.role)) {
    // Wrong role: send them to the portal that actually matches their role,
    // and only fall back to /student if the role is unknown.
    const dest = profile.role === "admin" ? "/admin" : "/student";
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}
