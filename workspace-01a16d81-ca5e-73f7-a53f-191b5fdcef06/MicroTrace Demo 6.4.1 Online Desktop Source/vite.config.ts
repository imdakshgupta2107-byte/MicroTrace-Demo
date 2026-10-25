import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  base: "./", // Relative assets for Capacitor and static subpath hosting.
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["icon-192.png", "icon-512.png", "empty-state.svg", "brand/logo-icon.png", "brand/logo-lockup.png", "brand/logo-original.png"],
      manifest: {
        name: process.env.VITE_APP_MODE === "demo" ? "MicroTrace Demo — Microbiology Lab" : "MicroTrace Automation — Microbiology Lab",
        short_name: process.env.VITE_APP_MODE === "demo" ? "MicroTrace Demo" : "MicroTrace",
        description: "Microbiology lab inventory, safety and student workbench.",
        theme_color: "#0f2142",
        background_color: "#eef1f6",
        display: "standalone",
        orientation: "any",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        categories: ["education", "productivity"],
      },
      workbox: {
        // Explicit because injectRegister:false disables the plugin's automatic defaults.
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "index.html",   // SPA routes work offline after install
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: { target: "es2020", chunkSizeWarningLimit: 1200 },
  server: { host: true, port: 5173, allowedHosts: true },
  preview: { host: true, port: 5174, allowedHosts: true },
});
