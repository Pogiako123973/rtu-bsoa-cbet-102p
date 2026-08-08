import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — ClassDesk" },
      { name: "description", content: "Sign in to view your lessons, schedule and assignments." },
      { property: "og:title", content: "Sign in — ClassDesk" },
      { property: "og:description", content: "Access your ClassDesk student or admin portal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-panel px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
        <Card className="shadow-lift">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <GraduationCap className="size-6" aria-hidden />
            </div>
            <CardTitle className="mt-4 text-2xl">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Sign in to see your lessons, schedule and tasks."
                : "Create a student account to see your lessons and schedule."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <button
              type="button"
              className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "No account yet? Create one"
                : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}