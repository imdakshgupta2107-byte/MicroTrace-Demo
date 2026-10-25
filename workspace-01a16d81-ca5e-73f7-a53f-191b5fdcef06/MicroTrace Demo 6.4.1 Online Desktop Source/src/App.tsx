import { useLocation } from "react-router-dom";
import { useLiveSession } from "@/live/use-live-session";
import { DEMO_BUILD } from "@/demo/config";
import { readLiveSession } from "@/live/session";
import LiveLogin from "@/live/live-login";
import LiveAccountPage from "@/live/account-page";
import AutomationPage from "@/automation/automation-page";
import AutomationReportPage from "@/automation/report-page";
import { RouteRedirect } from "@/components/auth/route-redirect";
// App — route table. Onboarding first; every screen lives under AppShell.
import { Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/dashboard-page";
import OnboardingPage from "@/pages/onboarding-page";
import ChemicalsPage from "@/pages/chemicals-page";
import ContainersPage from "@/pages/containers-page";
import DiscrepanciesPage from "@/pages/discrepancies-page";
import BookingsPage from "@/pages/bookings-page";
import RequestsPage from "@/pages/requests-page";
import PracticalsPage from "@/pages/practicals-page";
import ProcurementPage from "@/pages/procurement-page";
import VendorsPage from "@/pages/vendors-page";
import WorkbenchPage from "@/pages/workbench-page";
import ReportsPage from "@/pages/reports-page";
import AuditPage from "@/pages/audit-page";
import SettingsPage from "@/pages/settings-page";
import DetailsPage from "@/pages/details-page";
import RegistersPage from "@/pages/registers-page";
import ProjectsPage from "@/pages/projects-page";
import DailyOperationsPage from "@/pages/daily-operations-page";
import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useStudent";
import { ToastHost } from "@/components/layout/toast-host";

function RequireRole({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const live = useLiveSession();
  const location = useLocation();
  const { profile } = useStudent();
  if (!DEMO_BUILD && live.status === "loading") return <p role="status" className="p-5 text-sm text-slate-500">Verifying authenticated lab access…</p>;
  if (!role || !profile?.setupDone || (!DEMO_BUILD && readLiveSession().recovery)) return <RouteRedirect to={DEMO_BUILD ? "/onboarding" : `/onboarding?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/onboarding" element={DEMO_BUILD ? <OnboardingPage /> : <LiveLogin />} />
      <Route element={<RequireRole><AppShell /></RequireRole>}>
        <Route path="/" element={<RouteRedirect to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/chemicals" element={<ChemicalsPage />} />
        <Route path="/containers" element={<ContainersPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/operations" element={<DailyOperationsPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/discrepancies" element={<DiscrepanciesPage />} />
        <Route path="/practicals" element={<PracticalsPage />} />
        <Route path="/procurement" element={<ProcurementPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/workbench" element={<WorkbenchPage />} />
        <Route path="/workbench/:tool" element={<WorkbenchPage />} />
        <Route path="/registers" element={<RegistersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/automation/reports/:id" element={<AutomationReportPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/settings" element={DEMO_BUILD ? <SettingsPage /> : <LiveAccountPage />} />
        <Route path="/details" element={<DetailsPage />} />
        <Route path="*" element={<RouteRedirect to="/dashboard" replace />} />
      </Route>
    </Routes>
    <ToastHost />
    </>
  );
}
