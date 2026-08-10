import { useEffect } from "react";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

/**
 * Mounts once near the app root. Registers the service worker (production
 * only) and prompts the user to refresh when a new version is ready.
 */
export function PwaRegister() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const updateSW = registerSW({
      onNeedRefresh() {
        toast("New version available", {
          description: "Click to reload with the latest changes.",
          action: {
            label: "Reload",
            onClick: () => updateSW(true),
          },
          duration: Infinity,
        });
      },
      onOfflineReady() {
        toast.success("Ready to work offline", {
          description: "ClassDesk will load even without a connection.",
        });
      },
      onRegisteredSW(swUrl) {
        // Useful for debugging; harmless in production.
        console.info("[pwa] service worker registered:", swUrl);
      },
    });
  }, []);

  return null;
}
