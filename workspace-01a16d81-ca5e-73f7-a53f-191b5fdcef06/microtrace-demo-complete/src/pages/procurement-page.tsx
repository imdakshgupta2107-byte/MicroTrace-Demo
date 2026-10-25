import { RouteRedirect } from "@/components/auth/route-redirect";
import { PageHeader } from "@/components/layout/page-header";
import { OrderingPanel } from "@/components/procurement/ordering-panel";
import { useAuth } from "@/hooks/useAuth";

export default function ProcurementPage() {
  const { role } = useAuth();
  if (role !== "staff" && role !== "principal") return <RouteRedirect to="/dashboard" replace />;
  return (
    <>
      <PageHeader title="Procurement" sub="Low-stock advice with cross-seller price comparison and weekly / monthly / yearly slots." />
      <OrderingPanel />
    </>
  );
}
