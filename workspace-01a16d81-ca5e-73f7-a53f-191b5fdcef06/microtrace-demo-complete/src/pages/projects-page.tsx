import { useMemo, useState } from "react";
import { RouteRedirect } from "@/components/auth/route-redirect";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UnitSelector } from "@/components/units/unit-selector";
import { CategoryBadge } from "@/components/chemicals/category-badge";
import { useLabData } from "@/hooks/useLabData";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { DEMO_BUILD } from "@/demo/config";
import { supabase } from "@/lib/supabase";
import { convertFromBase, findUnit, normalizeToBase, type UnitDimension } from "@/lib/units";
import { chemicalInventoryCategory } from "@/lib/inventory-categories";
import { uid } from "@/lib/utils";
import type { ProjectBookingState, ScientificDimension } from "@/lib/types";
import { AlertTriangle, CalendarClock, CheckCircle2, FlaskConical, Layers3, Plus, ShieldAlert, Users, Wrench } from "lucide-react";

const ACTIVE_BOOKING_STATES: ProjectBookingState[] = ["pending", "confirmed", "active"];
const RESOURCE_KINDS = ["bench_tool", "instrument", "fume_hood", "biosafety_cabinet", "cold_storage", "other"] as const;

const timeRange = (date: string, start: string, end: string) => ({
  startsAt: new Date(`${date}T${start}:00`).toISOString(),
  endsAt: new Date(`${date}T${end}:00`).toISOString(),
});

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

function projectCodeFromTitle(title: string) {
  const stem = title.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 18) || "PROJECT";
  return `${stem}-${new Date().getFullYear()}`;
}

export default function ProjectsPage() {
  const { role } = useAuth();
  const { data, mutate, pending } = useLabData();
  const { toast, err } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [parentProjectId, setParentProjectId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [benchName, setBenchName] = useState("");
  const [benchRoom, setBenchRoom] = useState("");
  const [resourceName, setResourceName] = useState("");
  const [resourceKind, setResourceKind] = useState<(typeof RESOURCE_KINDS)[number]>("bench_tool");
  const [resourceBenchId, setResourceBenchId] = useState("");
  const [bookingTeamId, setBookingTeamId] = useState("");
  const [bookingBenchId, setBookingBenchId] = useState("");
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bookingStart, setBookingStart] = useState("09:00");
  const [bookingEnd, setBookingEnd] = useState("11:00");
  const [bookingPurpose, setBookingPurpose] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [quotaChemicalId, setQuotaChemicalId] = useState("");
  const [quotaAmount, setQuotaAmount] = useState("1");
  const [quotaUnitCode, setQuotaUnitCode] = useState("g");
  const [reagentQuotaId, setReagentQuotaId] = useState("");
  const [reagentAmount, setReagentAmount] = useState("0");

  if (role !== "teacher" && role !== "staff" && role !== "principal") {
    return <RouteRedirect to="/dashboard" replace />;
  }

  const canConfigureLab = role === "staff" || role === "principal";
  const projects = data?.projects ?? [];
  const projectId = selectedProjectId || projects[0]?.id || "";
  const selectedProject = projects.find((project) => project.id === projectId);
  const teams = (data?.projectTeams ?? []).filter((team) => team.project_id === projectId);
  const projectQuotas = (data?.projectQuotas ?? []).filter((quota) => quota.project_id === projectId);
  const { startsAt, endsAt } = timeRange(bookingDate, bookingStart, bookingEnd);

  const bookingConflicts = useMemo(() => {
    if (!bookingBenchId || new Date(startsAt) >= new Date(endsAt)) return [];
    const conflicts: Array<{ type: "bench" | "resource" | "quota"; message: string }> = [];
    const overlappingBookings = (data?.projectBookings ?? []).filter((booking) =>
      ACTIVE_BOOKING_STATES.includes(booking.state)
      && overlaps(startsAt, endsAt, booking.starts_at, booking.ends_at),
    );
    const bench = (data?.benches ?? []).find((item) => item.id === bookingBenchId);
    if (overlappingBookings.some((booking) => booking.bench_id === bookingBenchId)) {
      conflicts.push({ type: "bench", message: `${bench?.name ?? "Selected bench"} is already reserved for part of this time.` });
    }
    for (const resourceId of selectedResources) {
      const resource = (data?.resources ?? []).find((item) => item.id === resourceId);
      const resourceConflict = (data?.bookingResourceReservations ?? []).some((reservation) => {
        if (reservation.resource_id !== resourceId || !ACTIVE_BOOKING_STATES.includes(reservation.state)) return false;
        return overlaps(startsAt, endsAt, reservation.starts_at, reservation.ends_at);
      });
      if (resourceConflict) conflicts.push({ type: "resource", message: `${resource?.name ?? "Selected resource"} is already reserved for part of this time.` });
    }
    if (reagentQuotaId && Number(reagentAmount) > 0) {
      const quota = projectQuotas.find((item) => item.id === reagentQuotaId);
      if (quota) {
        const remaining = Number(quota.allocated_base) - Number(quota.reserved_base) - Number(quota.consumed_base);
        if (Number(reagentAmount) > remaining) conflicts.push({ type: "quota", message: `Requested reagent allocation exceeds this project’s remaining quota (${remaining}).` });
      }
    }
    return conflicts;
  }, [bookingBenchId, data?.benches, data?.bookingResourceReservations, data?.projectBookings, endsAt, projectQuotas, reagentAmount, reagentQuotaId, selectedResources, startsAt]);

  const createProject = async () => {
    if (!projectTitle.trim()) return err("Project title is required.");
    const row = {
      id: uid(),
      project_code: projectCodeFromTitle(projectTitle),
      title: projectTitle.trim(),
      description: projectDescription.trim(),
      parent_project_id: parentProjectId || null,
      status: "active",
      starts_on: new Date().toISOString().slice(0, 10),
      ends_on: null,
    };
    try {
      await mutate({ kind: "insert", table: "projects", row, audit: `Created project ${row.project_code}` });
      setSelectedProjectId(row.id);
      setProjectTitle("");
      setProjectDescription("");
      setParentProjectId("");
      toast(row.parent_project_id ? "Sub-project created." : "Project created.");
    } catch (error) { err(String(error)); }
  };

  const createTeam = async () => {
    if (!projectId) return err("Create or select a project first.");
    if (!teamName.trim()) return err("Team name is required.");
    const row = { id: uid(), project_id: projectId, team_code: `TEAM-${(teams.length + 1).toString().padStart(2, "0")}`, name: teamName.trim() };
    try {
      await mutate({ kind: "insert", table: "project_teams", row, audit: `Added team ${row.name}` });
      setTeamName("");
      toast("Research team added.");
    } catch (error) { err(String(error)); }
  };

  const createBench = async () => {
    if (!canConfigureLab) return err("Only Staff or Principal can configure benches and tools.");
    if (!benchName.trim()) return err("Bench name is required.");
    const row = { id: uid(), code: `BENCH-${(data?.benches.length ?? 0) + 1}`, name: benchName.trim(), room_name: benchRoom.trim(), active: true, notes: "" };
    try {
      await mutate({ kind: "insert", table: "lab_benches", row, audit: `Added bench ${row.name}` });
      setBenchName("");
      setBenchRoom("");
      toast("Bench added to the scheduler.");
    } catch (error) { err(String(error)); }
  };

  const createResource = async () => {
    if (!canConfigureLab) return err("Only Staff or Principal can configure benches and tools.");
    if (!resourceName.trim()) return err("Resource name is required.");
    const row = {
      id: uid(), code: `RESOURCE-${(data?.resources.length ?? 0) + 1}`, name: resourceName.trim(), kind: resourceKind,
      bench_id: resourceBenchId || null, requires_exclusive_booking: true, active: true, notes: "",
    };
    try {
      await mutate({ kind: "insert", table: "lab_resources", row, audit: `Added resource ${row.name}` });
      setResourceName("");
      toast("Exclusive lab resource added.");
    } catch (error) { err(String(error)); }
  };

  const createQuota = async () => {
    if (!projectId || !quotaChemicalId) return err("Select a project and a chemical.");
    const unit = findUnit(quotaUnitCode);
    const amount = Number(quotaAmount);
    if (!unit || !Number.isFinite(amount) || amount <= 0) return err("Enter a positive quota quantity.");
    const row = {
      id: uid(), project_id: projectId, chemical_id: quotaChemicalId,
      dimension: unit.dimension as ScientificDimension,
      allocated_base: normalizeToBase(quotaAmount, unit), reserved_base: 0, consumed_base: 0,
    };
    try {
      await mutate({ kind: "insert", table: "project_reagent_quotas", row, audit: "Allocated project reagent quota" });
      setQuotaAmount("1");
      toast("Project reagent quota allocated.");
    } catch (error) { err(String(error)); }
  };

  const createBooking = async () => {
    if (!projectId || !bookingBenchId || !bookingPurpose.trim()) return err("Select a project, bench and booking purpose.");
    if (new Date(startsAt) >= new Date(endsAt)) return err("End time must be after start time.");
    if (bookingConflicts.length) return err(bookingConflicts[0].message);

    const bookingId = uid();
    const reagent = reagentQuotaId && Number(reagentAmount) > 0
      ? [{ quota_id: reagentQuotaId, requested_base: Number(reagentAmount) }]
      : [];

    try {
      if (!DEMO_BUILD && supabase) {
        const { error } = await supabase.rpc("create_project_booking", {
          p_project_id: projectId,
          p_team_id: bookingTeamId || null,
          p_bench_id: bookingBenchId,
          p_starts_at: startsAt,
          p_ends_at: endsAt,
          p_purpose: bookingPurpose.trim(),
          p_notes: bookingNotes.trim(),
          p_resource_ids: selectedResources,
          p_reagents: reagent,
        });
        if (error) throw error;
      } else {
        await mutate({
          kind: "insert",
          table: "project_bookings",
          row: { id: bookingId, project_id: projectId, team_id: bookingTeamId || null, bench_id: bookingBenchId, starts_at: startsAt, ends_at: endsAt, state: "confirmed", purpose: bookingPurpose.trim(), notes: bookingNotes.trim() },
          audit: `Reserved bench for ${selectedProject?.project_code ?? "project"}`,
        });
        for (const resourceId of selectedResources) {
          await mutate({ kind: "insert", table: "booking_resource_reservations", row: { id: uid(), booking_id: bookingId, resource_id: resourceId, starts_at: startsAt, ends_at: endsAt, state: "confirmed" } });
        }
        if (reagent.length) {
          const requested = reagent[0].requested_base;
          await mutate({ kind: "insert", table: "booking_reagent_reservations", row: { id: uid(), booking_id: bookingId, quota_id: reagentQuotaId, requested_base: requested, issued_base: 0, state: "confirmed" } });
          const quota = projectQuotas.find((item) => item.id === reagentQuotaId)!;
          await mutate({ kind: "update", table: "project_reagent_quotas", id: quota.id, patch: { reserved_base: Number(quota.reserved_base) + requested } });
        }
      }
      setBookingPurpose("");
      setBookingNotes("");
      setSelectedResources([]);
      setReagentQuotaId("");
      setReagentAmount("0");
      toast("Project bench slot reserved. Resource, quota and conflict checks were applied.");
    } catch (error) {
      err(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <>
      <PageHeader title="Project lab schedule" sub="Project → sub-project → team → bench slot, with resource, quota and safety controls." />
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle><Layers3 size={16} className="text-gold-600" /> Project hierarchy</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {projects.length === 0 && <p className="text-xs text-slate-500">Create the first research project to start scheduling.</p>}
              {projects.filter((project) => !project.parent_project_id).map((project) => (
                <div key={project.id}>
                  <button type="button" onClick={() => setSelectedProjectId(project.id)} className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 ${project.id === projectId ? "border-gold bg-gold-100 text-navy" : "border-slate-200 hover:border-slate-300"}`}>
                    <span className="block truncate">{project.project_code}</span>
                    <span className="block truncate text-[11px] font-medium opacity-75">{project.title}</span>
                  </button>
                  {projects.filter((child) => child.parent_project_id === project.id).map((child) => (
                    <button key={child.id} type="button" onClick={() => setSelectedProjectId(child.id)} className={`ml-4 mt-1 block w-[calc(100%-1rem)] rounded-lg border-l-2 px-2 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 ${child.id === projectId ? "border-gold bg-gold-50 font-bold text-navy" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      ↳ {child.project_code}
                    </button>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle><Plus size={16} className="text-gold-600" /> New project</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} placeholder="e.g. Water Microbiome Study" aria-label="Project title" />
              <Select value={parentProjectId} onChange={(event) => setParentProjectId(event.target.value)} aria-label="Optional parent project">
                <option value="">Root project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>Sub-project of {project.project_code}</option>)}
              </Select>
              <Textarea rows={2} value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} placeholder="Research objective (optional)" />
              <Button variant="primary" className="w-full" onClick={createProject} disabled={pending}>Create project</Button>
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle><CalendarClock size={16} className="text-gold-600" /> Reserve a project bench slot</CardTitle>
              {selectedProject && <span className="text-xs font-bold text-slate-500">{selectedProject.project_code}</span>}
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedProject ? <p className="text-sm text-slate-500">Select or create a project before reserving laboratory time.</p> : <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="space-y-1"><span className="block text-[11.5px] font-bold text-slate-600">Research team</span><Select value={bookingTeamId} onChange={(event) => setBookingTeamId(event.target.value)}><option value="">Project-level booking</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.team_code} · {team.name}</option>)}</Select></label>
                  <label className="space-y-1"><span className="block text-[11.5px] font-bold text-slate-600">Bench *</span><Select value={bookingBenchId} onChange={(event) => setBookingBenchId(event.target.value)}><option value="">Select bench</option>{(data?.benches ?? []).filter((bench) => bench.active).map((bench) => <option key={bench.id} value={bench.id}>{bench.code} · {bench.name}{bench.room_name ? ` (${bench.room_name})` : ""}</option>)}</Select></label>
                  <label className="space-y-1"><span className="block text-[11.5px] font-bold text-slate-600">Date *</span><Input type="date" value={bookingDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setBookingDate(event.target.value)} /></label>
                  <label className="space-y-1"><span className="block text-[11.5px] font-bold text-slate-600">Start *</span><Input type="time" value={bookingStart} onChange={(event) => setBookingStart(event.target.value)} /></label>
                  <label className="space-y-1"><span className="block text-[11.5px] font-bold text-slate-600">End *</span><Input type="time" value={bookingEnd} onChange={(event) => setBookingEnd(event.target.value)} /></label>
                  <label className="space-y-1 sm:col-span-2 lg:col-span-1"><span className="block text-[11.5px] font-bold text-slate-600">Purpose *</span><Input value={bookingPurpose} onChange={(event) => setBookingPurpose(event.target.value)} placeholder="e.g. DNA extraction run" /></label>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-bold text-slate-700">Exclusive tools and controlled workstations</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(data?.resources ?? []).filter((resource) => resource.active).map((resource) => {
                      const checked = selectedResources.includes(resource.id);
                      return <label key={resource.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs hover:bg-slate-50"><input type="checkbox" checked={checked} onChange={() => setSelectedResources((current) => checked ? current.filter((id) => id !== resource.id) : [...current, resource.id])} className="mt-0.5" /><span><b>{resource.name}</b><span className="block text-slate-500">{resource.kind.replace(/_/g, " ")}{resource.requires_exclusive_booking ? " · exclusive" : ""}</span></span></label>;
                    })}
                    {(data?.resources ?? []).length === 0 && <p className="text-xs text-slate-500">No resources configured yet. Add instruments, hoods or bench tools in the setup panel.</p>}
                  </div>
                </div>

                <div className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_130px]">
                  <label className="space-y-1"><span className="block text-xs font-bold text-slate-700">Reserve from a project reagent quota</span><Select value={reagentQuotaId} onChange={(event) => setReagentQuotaId(event.target.value)}><option value="">No reagent allocation</option>{projectQuotas.map((quota) => { const chemical = (data?.chemicals ?? []).find((item) => item.id === quota.chemical_id); const remaining = Number(quota.allocated_base) - Number(quota.reserved_base) - Number(quota.consumed_base); return <option key={quota.id} value={quota.id}>{chemical?.name ?? "Unknown reagent"} · {remaining} base units available</option>; })}</Select></label>
                  <label className="space-y-1"><span className="block text-xs font-bold text-slate-700">Base amount</span><Input type="number" min={0} step="any" value={reagentAmount} onChange={(event) => setReagentAmount(event.target.value)} disabled={!reagentQuotaId} /></label>
                </div>

                <Textarea rows={2} value={bookingNotes} onChange={(event) => setBookingNotes(event.target.value)} placeholder="Optional method, PPE, containment or handover notes" />

                {bookingConflicts.length > 0 ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><div className="flex gap-2 font-bold"><ShieldAlert size={16} /> Reservation blocked</div><ul className="mt-1 list-disc pl-5 text-xs">{bookingConflicts.map((conflict, index) => <li key={`${conflict.type}-${index}`}>{conflict.message}</li>)}</ul></div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><span className="inline-flex items-center gap-1 font-bold"><CheckCircle2 size={14} /> Available.</span> The server will re-check bench, resource, quota and hazard conflicts when you confirm.</div>}
                <Button variant="primary" onClick={createBooking} disabled={pending || bookingConflicts.length > 0}><CalendarClock size={15} /> Confirm project reservation</Button>
              </>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle><CalendarClock size={16} className="text-gold-600" /> Upcoming project reservations</CardTitle></CardHeader>
            <CardContent>
              {(data?.projectBookings ?? []).filter((booking) => booking.project_id === projectId).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, 12).map((booking) => {
                const bench = (data?.benches ?? []).find((item) => item.id === booking.bench_id);
                const team = (data?.projectTeams ?? []).find((item) => item.id === booking.team_id);
                return <div key={booking.id} className="flex gap-3 border-b border-slate-100 py-2 last:border-0"><span className="mt-0.5 h-2 w-2 rounded-full bg-gold" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink">{booking.purpose}</p><p className="text-xs text-slate-500">{new Date(booking.starts_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} → {new Date(booking.ends_at).toLocaleTimeString("en-IN", { timeStyle: "short" })} · {bench?.name ?? "Bench"}{team ? ` · ${team.name}` : ""}</p></div><span className="text-xs font-bold capitalize text-slate-600">{booking.state}</span></div>;
              })}
              {!(data?.projectBookings ?? []).some((booking) => booking.project_id === projectId) && <p className="text-sm text-slate-500">No bench slots booked for this project yet.</p>}
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle><Users size={16} className="text-gold-600" /> Research team</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2"><Input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="e.g. Group A" disabled={!projectId} /><Button variant="outline" onClick={createTeam} disabled={!projectId || pending}><Plus size={15} /></Button></div>
              {teams.map((team) => <div key={team.id} className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs"><b>{team.team_code}</b> · {team.name}</div>)}
              {projectId && teams.length === 0 && <p className="text-xs text-slate-500">No teams yet — a project-level booking is still allowed.</p>}
            </CardContent>
          </Card>

          {canConfigureLab ? <Card>
            <CardHeader><CardTitle><Wrench size={16} className="text-gold-600" /> Benches & tools</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input value={benchName} onChange={(event) => setBenchName(event.target.value)} placeholder="Bench name" />
              <Input value={benchRoom} onChange={(event) => setBenchRoom(event.target.value)} placeholder="Room / zone (optional)" />
              <Button variant="outline" className="w-full" onClick={createBench} disabled={pending}>Add bench</Button>
              <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                <Input value={resourceName} onChange={(event) => setResourceName(event.target.value)} placeholder="Tool / instrument name" />
                <Select value={resourceKind} onChange={(event) => setResourceKind(event.target.value as (typeof RESOURCE_KINDS)[number])}>{RESOURCE_KINDS.map((kind) => <option key={kind} value={kind}>{kind.replace(/_/g, " ")}</option>)}</Select>
                <Select value={resourceBenchId} onChange={(event) => setResourceBenchId(event.target.value)}><option value="">Not tied to one bench</option>{(data?.benches ?? []).map((bench) => <option key={bench.id} value={bench.id}>{bench.name}</option>)}</Select>
                <Button variant="outline" className="w-full" onClick={createResource} disabled={pending}>Add exclusive resource</Button>
              </div>
            </CardContent>
          </Card> : <Card>
            <CardHeader><CardTitle><Wrench size={16} className="text-gold-600" /> Benches & tools</CardTitle></CardHeader>
            <CardContent><p className="text-xs leading-relaxed text-slate-500">Bench and exclusive-tool setup is administered by Staff or Principal. Available resources can still be selected in a project reservation.</p></CardContent>
          </Card>}

          <Card>
            <CardHeader><CardTitle><FlaskConical size={16} className="text-gold-600" /> Reagent quota</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Select value={quotaChemicalId} onChange={(event) => {
                const chemical = (data?.chemicals ?? []).find((item) => item.id === event.target.value);
                setQuotaChemicalId(event.target.value);
                setQuotaUnitCode(chemical?.unit_code ?? "g");
              }} disabled={!projectId}><option value="">Select reagent</option>{(data?.chemicals ?? []).map((chemical) => <option key={chemical.id} value={chemical.id}>{chemical.name}</option>)}</Select>
              <div className="grid grid-cols-[1fr_110px] gap-2"><Input type="number" min={0} step="any" value={quotaAmount} onChange={(event) => setQuotaAmount(event.target.value)} disabled={!projectId} /><UnitSelector id="project-quota-unit" dimension={(findUnit(quotaUnitCode)?.dimension ?? "mass") as UnitDimension} value={quotaUnitCode} onChange={setQuotaUnitCode} /></div>
              <Button variant="outline" className="w-full" onClick={createQuota} disabled={!projectId || pending}>Allocate quota</Button>
              <div className="space-y-1 pt-2">{projectQuotas.map((quota) => { const chemical = (data?.chemicals ?? []).find((item) => item.id === quota.chemical_id); const remaining = Number(quota.allocated_base) - Number(quota.reserved_base) - Number(quota.consumed_base); return <div key={quota.id} className="rounded-lg border border-slate-100 px-2 py-1.5 text-[11px]"><span className="font-bold">{chemical?.name ?? "Unknown reagent"}</span>{chemical && <CategoryBadge category={chemicalInventoryCategory(chemical)} className="ml-1 align-middle" />}<span className="block text-slate-500">{remaining} base units remaining</span></div>; })}</div>
            </CardContent>
          </Card>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900"><span className="inline-flex items-center gap-1 font-bold"><AlertTriangle size={14} /> Controlled scheduling</span><br />A visual availability result is advisory. Live submissions are validated atomically by PostgreSQL against current bookings, exclusive tools, quotas and hazardous-use rules.</div>
        </aside>
      </div>
    </>
  );
}
