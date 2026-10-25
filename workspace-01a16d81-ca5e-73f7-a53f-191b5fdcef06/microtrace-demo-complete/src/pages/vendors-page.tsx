import { RouteRedirect } from "@/components/auth/route-redirect";
import { PageHeader } from "@/components/layout/page-header";
import { VendorList } from "@/components/vendors/vendor-list";
import { useAuth } from "@/hooks/useAuth";

export default function VendorsPage() {
  const { role } = useAuth();
  if (role !== "staff" && role !== "principal") return <RouteRedirect to="/dashboard" replace />;
  return (
    <>
      <PageHeader title="Vendors" sub="Suppliers and their quoted prices." />
      <VendorList />
    </>
  );
}
