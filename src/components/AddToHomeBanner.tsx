import { useEffect, useState } from "react";
import { X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Detects when the user is on a phone browser that supports installing
 * PWA "Add to Home Screen" and shows a dismissable banner with the
 * platform-specific instructions. Hidden automatically once the user
 * has installed the app (running in standalone display mode).
 */
export function AddToHomeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    if (dismissed) return;

    // Already installed (running standalone) — no banner needed.
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ("standalone" in window.navigator && (window.navigator as any).standalone) return;

    // Was the user already told to install? Don't nag.
    if (localStorage.getItem("a2hs-dismissed") === "1") {
      setDismissed(true);
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");
  }, [dismissed]);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("a2hs-dismissed", "1");
  }

  if (!platform || dismissed) return null;

  return (
    <div className="fixed inset-x-2 bottom-2 z-50 mx-auto max-w-md rounded-xl border bg-card p-3 shadow-lift sm:inset-x-auto sm:right-4 sm:bottom-4 sm:left-auto sm:max-w-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install ClassDesk</p>
          <p className="text-xs text-muted-foreground">
            {platform === "ios" ? (
              <>
                Tap <span className="font-medium">Share</span> then{" "}
                <span className="font-medium">Add to Home Screen</span>.
              </>
            ) : (
              <>
                Tap the menu (⋮) and choose{" "}
                <span className="font-medium">Add to Home screen</span>.
              </>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
