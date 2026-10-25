import { RouteRedirect } from "@/components/auth/route-redirect";
import { PageHeader } from "@/components/layout/page-header";
import { WorkbenchShell } from "@/workbench/workbench-shell";
import { useAuth } from "@/hooks/useAuth";

export default function WorkbenchPage() {
  const { role } = useAuth();
  // Workbench is ONLY for students & teachers (staff/principal use the app itself).
  if (role !== "student" && role !== "teacher") return <RouteRedirect to="/dashboard" replace />;
  return (
    <>
      <PageHeader title="The Workbench" sub="Calculators, plate tools and timers for practical work." />
      <WorkbenchShell />
    </>
  );
}
