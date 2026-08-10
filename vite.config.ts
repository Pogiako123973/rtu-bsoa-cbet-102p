import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Register the service worker as soon as the app loads. Auto-update
      // means users get new versions without manual refresh.
      registerType: "autoUpdate",
      includeAssets: ["logo.svg", "favicon.svg"],
      manifest: {
        name: "RTU-BSOA",
        short_name: "RTU-BSOA",
        description:
          "Student and admin portal for lessons, schedule, assignments, attendance and chat.",
        theme_color: "#0a3d4a",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/logo.png",
            sizes: "any",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/logo-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/logo-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // Cache the app shell so the portal loads even when offline.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // Network-first for the Supabase API so live data is always fresh.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin.includes("supabase"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
      devOptions: {
        // Enable the service worker in `npm run dev` for easier testing.
        // Comment out if it gets in the way of regular dev work.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
