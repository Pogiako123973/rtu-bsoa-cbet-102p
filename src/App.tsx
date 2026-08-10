import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/PwaRegister";
import { supabaseConfigured } from "@/lib/supabase";

import LandingPage from "@/pages/Landing";
import LoginPage from "@/pages/Login";
import SignupPage from "@/pages/Signup";

import StudentDashboard from "@/pages/student/Dashboard";
import StudentLessons from "@/pages/student/Lessons";
import StudentSchedule from "@/pages/student/Schedule";
import StudentAssignments from "@/pages/student/Assignments";
import StudentAttendance from "@/pages/student/Attendance";
import StudentChat from "@/pages/student/Chat";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminStudents from "@/pages/admin/Students";
import AdminLessons from "@/pages/admin/Lessons";
import AdminSchedule from "@/pages/admin/Schedule";
import AdminAssignments from "@/pages/admin/Assignments";
import AdminAttendance from "@/pages/admin/Attendance";
import AdminChat from "@/pages/admin/Chat";

import NotFound from "@/pages/NotFound";

export default function App() {
  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-lg rounded-lg border bg-card p-6 shadow-soft">
          <h1 className="font-display text-xl font-semibold">Supabase is not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add the following to <code className="rounded bg-muted px-1 py-0.5">.env</code> in the project root and restart <code className="rounded bg-muted px-1 py-0.5">npm run dev</code>:
          </p>
          <pre className="mt-3 rounded bg-muted p-3 text-xs">
{`VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_SUPABASE_ANON_KEY=eyJ...`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <>
      <PwaRegister />
      <Toaster richColors position="top-right" />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Student portal */}
        <Route
          path="/student"
          element={
            <ProtectedRoute roles={["student"]}>
              <AppShell>
                <StudentDashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/lessons"
          element={
            <ProtectedRoute roles={["student"]}>
              <AppShell>
                <StudentLessons />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/schedule"
          element={
            <ProtectedRoute roles={["student"]}>
              <AppShell>
                <StudentSchedule />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/assignments"
          element={
            <ProtectedRoute roles={["student"]}>
              <AppShell>
                <StudentAssignments />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/attendance"
          element={
            <ProtectedRoute roles={["student"]}>
              <AppShell>
                <StudentAttendance />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/chat"
          element={
            <ProtectedRoute roles={["student"]}>
              <AppShell>
                <StudentChat />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* Admin portal */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AppShell>
                <AdminDashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AppShell>
                <AdminStudents />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/lessons"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AppShell>
                <AdminLessons />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/schedule"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AppShell>
                <AdminSchedule />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/assignments"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AppShell>
                <AdminAssignments />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AppShell>
                <AdminAttendance />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/chat"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AppShell>
                <AdminChat />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* Legacy / fallback */}
        <Route path="/dashboard" element={<Navigate to="/student" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}