// app-shell — root layout: sidebar (desktop) / bottom-nav (mobile),
// top bar with scan + emergency, toast host, emergency overlay.
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { ScannerSheet } from "@/components/scanner/scanner-sheet";
import { EmergencyOverlay } from "@/components/emergency/emergency-overlay";
import { useAuth } from "@/hooks/useAuth";

export function AppShell() {
  const { role, lock } = useAuth();
  const [scanOpen, setScanOpen] = useState(false);
  const [emgOpen, setEmgOpen] = useState(false);
  return (
    <div className="app-viewport bg-navy-50 flex">
      <Sidebar role={role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar role={role} onScan={() => setScanOpen(true)} onEmergency={() => setEmgOpen(true)} onLock={lock} />
        <main className="safe-app-content flex-1 min-w-0 px-3 sm:px-5 py-4 max-w-[1200px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <BottomNav role={role} />
      <ScannerSheet open={scanOpen} onClose={() => setScanOpen(false)} role={role} />
      <EmergencyOverlay open={emgOpen} onClose={() => setEmgOpen(false)} role={role} />
    </div>
  );
}
