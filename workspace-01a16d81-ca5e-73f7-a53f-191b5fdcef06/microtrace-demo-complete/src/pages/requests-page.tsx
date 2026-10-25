import { PageHeader } from "@/components/layout/page-header";
import { RequestList } from "@/components/requests/request-list";
import { ServiceDeskPanel } from "@/components/service-desk/service-desk-panel";
import { useAuth } from "@/hooks/useAuth";

export default function RequestsPage() {
  const { role } = useAuth();
  if (!role) return null;
  return (
    <>
      <PageHeader title="Requests"
        sub={role === "staff" || role === "principal"
          ? "Route operational reports and academic requirements, then approve and issue stock through the correct control."
          : "Report an observed lab issue or submit a material/culture requirement; stock requests remain separately traceable."} />
      <div className="space-y-7">
        <ServiceDeskPanel role={role} />
        <section aria-labelledby="stock-request-heading" className="space-y-3 pt-1">
          <div className="border-t border-slate-200 pt-5">
            <h2 id="stock-request-heading" className="font-extrabold text-[15px] text-ink">Stock issue requests</h2>
            <p className="mt-1 text-[12.5px] text-slate-500">The original stock-request workflow remains available for a named in-stock item. Approval and issue are recorded separately from Lab Desk routing.</p>
          </div>
          <RequestList role={role} />
        </section>
      </div>
    </>
  );
}
