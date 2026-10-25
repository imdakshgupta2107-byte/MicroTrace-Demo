import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/useAuth";
import { useLabData } from "@/hooks/useLabData";
import { ChemicalList } from "@/components/chemicals/chemical-list";
import { RequestForm } from "@/components/requests/request-form";
import { ContainerForm } from "@/components/containers/container-form";
import { canManage } from "@/lib/auth";
import type { Chemical } from "@/lib/types";

export default function ChemicalsPage() {
  const { role } = useAuth();
  const { data } = useLabData();
  const [reqChem, setReqChem] = useState<Chemical | null>(null);
  const [ctlChem, setCtlChem] = useState<Chemical | null>(null);
  return (
    <>
      <PageHeader title="Lab inventory" sub="Chemicals, media, glassware, instruments, consumables and cultures." />
      <ChemicalList
        chemicals={data?.chemicals ?? []} containers={data?.containers ?? []}
        prices={data?.prices ?? []} vendors={data?.vendors ?? []}
        canManage={canManage(role)}
        onRequestChem={(role === "student" || role === "teacher") ? setReqChem : undefined}
        onAddContainer={canManage(role) ? setCtlChem : undefined}
      />
      {reqChem && (role === "student" || role === "teacher") && (
        <RequestForm open prefill={reqChem} role={role} onClose={() => setReqChem(null)} />
      )}
      {ctlChem && (
        <ContainerForm open preChem={ctlChem} onClose={() => setCtlChem(null)} />
      )}
    </>
  );
}
