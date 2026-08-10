import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { AuthShell, AuthHeader } from "@/components/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await signIn(email.trim(), password);
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setBusy(false);
      toast.error("No session was created. Check your credentials.");
      return;
    }

    // Fetch the fresh profile row so we can route by role. The onAuthStateChange
    // listener will also call this, but doing it here lets us navigate immediately.
    let role: string | null = null;
    let profileError: string | null = null;
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (error) {
        profileError = error.message;
        // eslint-disable-next-line no-console
        console.warn("[login] failed to fetch profile for routing:", error.message);
      } else {
        role = profile?.role ?? null;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[login] exception fetching profile for routing:", err);
    }

    // If we still don't know the role (couldn't read the profile row at all),
    // fall back to the JWT's app_metadata / user_metadata which the trigger set.
    if (!role) {
      role =
        (data.session.user.app_metadata?.role as string | undefined) ??
        (data.session.user.user_metadata?.role as string | undefined) ??
        null;
    }

    // eslint-disable-next-line no-console
    console.log("[login] routing decision:", {
      role,
      profileError,
      hasProfile: Boolean(role),
    });

    setBusy(false);

    if (role === "admin") {
      toast.success("Welcome back, admin!");
      navigate("/admin", { replace: true });
    } else if (role === "student") {
      toast.success("Welcome back!");
      navigate("/student", { replace: true });
    } else {
      // Couldn't determine role — show a clear error instead of silently
      // sending them to the wrong portal.
      toast.error(
        profileError
          ? `Could not load your profile: ${profileError}`
          : "Could not determine your account role. Please ask the admin to check your profile row.",
        { duration: 10000 }
      );
      // Stay on /login so they can read the message.
    }
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md border-white/20 bg-card/95 shadow-2xl backdrop-blur">
        <div className="px-6 pt-6">
          <AuthHeader
            title="Sign in to BSOA"
            subtitle="Use the email and password you signed up with."
          />
        </div>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              No account yet?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/" className="hover:underline">
                ← Back home
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthShell>
  );
}