import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { registerSW } from "virtual:pwa-register";
import { AppErrorBoundary } from "./components/app-error-boundary";
import App from "./App";
import "./index.css";
import { DEMO_BUILD } from "./demo/config";
import { initializeLiveSession } from "./live/session";
import { initializeDemo } from "./demo/seed";

// One guarded, atomic seed before React/StrictMode, never during a render.
if (DEMO_BUILD) initializeDemo();
else initializeLiveSession();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5000, refetchOnWindowFocus: false, retry: 1 } },
});
const native = Capacitor.isNativePlatform();
const desktop = navigator.userAgent.includes("MicroTraceDesktop");
const embedded = native || desktop;
// Native and desktop bundles use hash routes so a reload never requests a
// nonexistent local /dashboard or /onboarding file. The website keeps normal URLs.
const Router = embedded ? HashRouter : BrowserRouter;

if ("serviceWorker" in navigator) {
  if (!embedded && window.isSecureContext) {
    registerSW({ immediate: true });
  } else if (embedded) {
    // Bundled apps must not let a worker from an earlier version intercept assets.
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </Router>
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
