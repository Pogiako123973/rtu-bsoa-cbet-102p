interface LogoProps {
  className?: string;
  size?: number;
  rounded?: boolean;
}

/**
 * The BSA teaching-demo badge logo. Used as a small icon next to
 * "ClassDesk" in the sidebar and as the centered icon on the auth
 * pages. The asset itself is transparent, so we never wrap it in a
 * background — `rounded` only applies a `border-radius` for clipping.
 */
export function Logo({ className = "", size = 28, rounded = false }: LogoProps) {
  const radius = rounded ? size * 0.22 : 0;
  return (
    <img
      src="/logo.png"
      alt="RTU"
      style={{ width: size, height: size, borderRadius: radius }}
      className={`object-contain ${className}`}
    />
  );
}
