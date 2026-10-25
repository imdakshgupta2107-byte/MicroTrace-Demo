import type { CapacitorConfig } from "@capacitor/cli";

/** A single, bundled local-first demo app — it never points at a development or live server. */
const config: CapacitorConfig = {
  appId: "com.microtrace.lab.microtracedemo",
  appName: "MicroTrace Demo",
  webDir: "dist",
  backgroundColor: "#0f2142",
  server: { androidScheme: "https" },
  android: { allowMixedContent: false },
  plugins: { CapacitorHttp: { enabled: false } },
};
export default config;
