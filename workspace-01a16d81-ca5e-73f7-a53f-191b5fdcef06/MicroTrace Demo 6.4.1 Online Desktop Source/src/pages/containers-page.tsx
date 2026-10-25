import { PageHeader } from "@/components/layout/page-header";
import { ContainerList } from "@/components/containers/container-list";
import { useAuth } from "@/hooks/useAuth";
import { canManage } from "@/lib/auth";

export default function ContainersPage() {
  const { role } = useAuth();
  return (
    <>
      <PageHeader title="Containers" sub="Every physical bottle: qty, barcode, expiry, location." />
      <ContainerList canManage={canManage(role)} />
    </>
  );
}
