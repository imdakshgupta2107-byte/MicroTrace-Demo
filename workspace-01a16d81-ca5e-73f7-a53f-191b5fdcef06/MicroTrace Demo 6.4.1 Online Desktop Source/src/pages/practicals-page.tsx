import { PageHeader } from "@/components/layout/page-header";
import { PracticalList } from "@/components/practicals/practical-list";
import { useAuth } from "@/hooks/useAuth";

export default function PracticalsPage() {
  const { role } = useAuth();
  return (
    <>
      <PageHeader title="Practicals" sub="Scheduled classes and their chemical lists." />
      <PracticalList role={role} />
    </>
  );
}
