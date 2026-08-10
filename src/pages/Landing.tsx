import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  ClipboardList,
  MessagesSquare,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* ── Background ───────────────────────────────────────────────
          Layered: deep brand gradient + two soft glowing orbs that
          slowly drift + a faint dot grid for texture. */}
      <div
        aria-hiddenF
        className="absolute inset-0 -z-30"
        style={{
          background:
            "linear-gradient(140deg, oklch(0.20 0.06 225) 0%, oklch(0.34 0.09 200) 50%, oklch(0.48 0.11 175) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none -z-30 absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.7 0.18 200 / 0.55), transparent 70%)",
          animation: "kd-float 14s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none -z-30 absolute -bottom-32 -right-32 h-[560px] w-[560px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.72 0.16 165 / 0.55), transparent 70%)",
          animation: "kd-float 18s ease-in-out infinite reverse",
        }}
      />
      {/* Dot grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* ── Seal centerpiece ──────────────────────────────────────────
          Three concentric layers behind the seal:
          1. Wide soft halo (radial gradient)
          2. Rotating thin conic ring
          3. The seal itself, slightly lifted by a soft drop-shadow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-20 h-[640px] w-[640px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.85 0.12 195 / 0.45) 0%, oklch(0.65 0.13 190 / 0.20) 40%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-20 h-[540px] w-[540px] max-w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 mix-blend-screen"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, oklch(0.85 0.15 200 / 0.5) 30deg, transparent 60deg, oklch(0.85 0.15 165 / 0.5) 200deg, transparent 230deg, oklch(0.85 0.15 200 / 0.5) 330deg, transparent 360deg)",
          animation: "kd-spin 22s linear infinite",
        }}
      />
      <img
        src="/logo@2x.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-20 h-[460px] w-[460px] max-w-[80vw] max-h-[70vh] -translate-x-1/2 -translate-y-1/2 object-contain opacity-95 drop-shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
      />

      {/* Vignette to focus attention on the center */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* ── Foreground content ──────────────────────────────────────── */}
      <div className="relative mx-auto flex max-w-5xl flex-col gap-12 px-6 py-10 sm:py-14">
        {/* Header */}
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
              <img src="/logo.png" alt="RTU" className="h-7 w-7 object-contain" />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  boxShadow:
                    "0 0 18px oklch(0.85 0.15 195 / 0.45), inset 0 0 0 1px rgba(255,255,255,0.15)",
                }}
              />
            </span>
            <span className="flex flex-col leading-none">
              <span>RTU BSOA</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
                BSOA · CBET · 25-102P
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              <Link to="/login">Log in</Link>
            </Button>
            <Button
              asChild
              className="bg-white text-foreground hover:bg-white/90"
            >
              <Link to="/signup">Sign up</Link>
            </Button>
          </nav>
        </header>

        {/* Hero */}
        <section className="grid gap-10 lg:gap-12 md:grid-cols-[1.25fr_1fr] md:items-end">
          {/* Left: copy + CTAs + stats */}
          <div>
            <span className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-xs font-medium backdrop-blur-md">
              <span className="relative grid h-5 w-5 place-items-center rounded-full bg-white/10">
                <Sparkles className="h-3 w-3 text-amber-200" />
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping rounded-full bg-amber-200/40"
                />
              </span>
              <span className="tracking-wide">Built For BSOA-CBET-25-102P</span>
            </span>

            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              One portal for{" "}
              <span className="bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-transparent">
                BSOA-CBET-25-102P.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">
              Schedule, assignments, review material, and chat for the whole
              section — all in one place. Less chasing links, more studying.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="group bg-white text-foreground shadow-lg shadow-black/20 hover:bg-white/90"
              >
                <Link to="/login">
                  Open the portal
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/[0.06] text-white backdrop-blur-md hover:bg-white/15"
              >
                <Link to="/signup">Create student account</Link>
              </Button>
            </div>

            {/* Stats strip */}
            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3 sm:gap-4">
              {[
                { k: "Sections", v: "1" },
                { k: "Subjects", v: "4+" },
                { k: "Always on", v: "24/7" },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center backdrop-blur"
                >
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-white/55">
                    {s.k}
                  </dt>
                  <dd className="mt-1 font-display text-xl font-semibold tracking-tight">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right: glassy feature panel */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-1 rounded-3xl opacity-60 blur-xl"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.85 0.12 200 / 0.4), oklch(0.85 0.12 165 / 0.4))",
              }}
            />
            <div className="relative rounded-3xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/70">
                  What's inside
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200 ring-1 ring-emerald-300/30">
                  <ShieldCheck className="h-3 w-3" /> Secured
                </span>
              </div>
              <ul className="space-y-2.5 text-sm">
                <Feature icon={BookOpen} label="Lessons" hint="Read course material" />
                <Feature icon={Calendar} label="Schedule" hint="See classes for the week" />
                <Feature icon={ClipboardList} label="Assignments" hint="Submit work, track due dates" />
                <Feature icon={MessagesSquare} label="Chat" hint="Talk with classmates and admins" />
              </ul>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70">
                <GraduationCap className="h-4 w-4 text-amber-200" />
                <span>Made for students of RTU BSOA.</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Page-level keyframes (slow drift + spin) */}
      <style>{`
        @keyframes kd-float {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(40px, -30px); }
        }
        @keyframes kd-spin {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/** One row in the feature panel: tinted icon chip + label + hint. */
function Feature({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof BookOpen;
  label: string;
  hint: string;
}) {
  return (
    <li className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-white/10 hover:bg-white/[0.05]">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan-300/25 to-emerald-300/20 ring-1 ring-white/15">
        <Icon className="h-4 w-4 text-cyan-100" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="font-medium text-white">{label}</span>
        <span className="text-xs text-white/55">{hint}</span>
      </div>
      <ArrowRight className="ml-auto h-3.5 w-3.5 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
    </li>
  );
}