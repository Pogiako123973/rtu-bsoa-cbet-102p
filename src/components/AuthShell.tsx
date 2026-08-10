import { ReactNode } from "react";
import { Logo } from "@/components/Logo";

/**
 * Shared shell for Login and Signup. Provides a rich, layered
 * background that features the RTU logo prominently but tastefully:
 *   - a deep teal gradient base (the same brand colors as bg-hero)
 *   - a large, faded logo watermark in the top-right
 *   - a subtle repeating pattern of small logos for texture
 *   - the auth card centered on top
 *
 * The logo is fully visible (not cropped out) and the gradient plus
 * the white card keep all foreground text and form elements readable.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-foreground">
      {/* Layer 1: deep brand gradient — same colors as bg-hero but tuned
          slightly darker so the white logo watermark pops. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30"
        style={{
          background:
            "linear-gradient(140deg, oklch(0.22 0.05 215) 0%, oklch(0.36 0.08 195) 55%, oklch(0.5 0.1 175) 100%)",
        }}
      />

      {/* Layer 2: large hero logo, top-right — softly faded so it reads
          as a watermark but is still clearly the RTU diamond. */}
      <img
        src="/logo.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 -z-20 h-[460px] w-[460px] object-contain opacity-25 blur-[1px] sm:-right-10 sm:-top-20 sm:h-[520px] sm:w-[520px]"
      />

      {/* Layer 3: a small accent logo, bottom-left — adds balance and
          reinforces the brand. */}
      <img
        src="/logo.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-12 -z-20 h-56 w-56 object-contain opacity-15 blur-[0.5px]"
      />

      {/* Layer 4: very subtle repeating logo pattern for texture.
          Uses an inline SVG data URI so we don't need extra files. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 64 64'><g fill='none' stroke='white' stroke-width='2'><polygon points='32,8 56,22 32,36 8,22'/><polygon points='32,28 56,42 32,56 8,42'/></g></svg>\")",
          backgroundSize: "140px 140px",
        }}
      />

      {children}
    </div>
  );
}

/**
 * The small header card used at the top of Login/Signup — centered
 * logo + title + subtitle. Kept here so Login and Signup stay in sync.
 */
export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col items-center text-center">
      <Logo rounded size={56} className="mb-3" />
      <h1 className="font-display text-2xl font-semibold text-foreground">
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}