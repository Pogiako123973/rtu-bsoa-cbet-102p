import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-white">
      {/* Brand gradient + faded logo watermark, matching the landing
          and auth pages. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30"
        style={{
          background:
            "linear-gradient(140deg, oklch(0.22 0.05 215) 0%, oklch(0.36 0.08 195) 55%, oklch(0.5 0.1 175) 100%)",
        }}
      />
      <img
        src="/logo.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute right-[-6rem] top-1/2 -z-20 h-[520px] w-[520px] -translate-y-1/2 object-contain opacity-20 blur-[1px]"
      />

      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Logo rounded size={64} />
        </div>
        <p className="font-display text-6xl font-semibold">404</p>
        <h1 className="mt-2 text-2xl font-medium">Page not found</h1>
        <p className="mt-2 text-white/80">The page you're looking for doesn't exist.</p>
        <Button asChild className="mt-6 bg-white text-foreground hover:bg-white/90">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}