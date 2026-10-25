import type { Container } from "@/lib/types";
import { containerTypeFromLabel, getContainerColor } from "@/lib/category-colors";
import { ContainerTypeBadge } from "./container-type-badge";

type Props = { containers: Container[]; onSelect?: (container: Container) => void };

/**
 * Compact, accessible shelf scan. Location groups represent shelves/cabinets;
 * each vessel has its locked type accent so color, text and badge agree.
 */
export function ShelfVisualizer({ containers, onSelect }: Props) {
  const shelves = new Map<string, Container[]>();
  for (const container of containers) {
    const location = container.location.trim() || "Unassigned location";
    const contents = shelves.get(location) ?? [];
    contents.push(container);
    shelves.set(location, contents);
  }
  if (!shelves.size) return null;

  return (
    <section aria-labelledby="shelf-visualizer-title" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="shelf-visualizer-title" className="text-[13px] font-extrabold text-ink">Shelf visual scan</h2>
          <p className="text-[11px] text-slate-500">Vessel colors are locked by type; labels and icons keep the map readable without color.</p>
        </div>
        <span className="text-[10.5px] font-bold text-slate-500">{containers.length} active container{containers.length === 1 ? "" : "s"}</span>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from(shelves.entries()).map(([location, vesselList]) => (
          <section key={location} aria-label={`${location}, ${vesselList.length} containers`} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h3 className="truncate text-[11.5px] font-extrabold text-slate-700">{location}</h3>
              <span className="shrink-0 text-[10.5px] font-semibold text-slate-400">{vesselList.length} vessel{vesselList.length === 1 ? "" : "s"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {vesselList.map((container) => {
                const vesselType = container.container_type ?? containerTypeFromLabel(container.label);
                const theme = getContainerColor(vesselType);
                return (
                  <button
                    key={container.id}
                    type="button"
                    disabled={!onSelect}
                    onClick={() => onSelect?.(container)}
                    aria-label={onSelect ? `Open ${container.label || "container"}, ${theme.label}` : undefined}
                    className={`min-w-0 rounded-lg border-2 ${theme.border} ${theme.softBackground} p-2 text-left transition disabled:cursor-default ${onSelect ? "hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25" : ""}`}
                  >
                    <span className={`mb-1 block h-1.5 rounded-full ${theme.background}`} aria-hidden="true" />
                    <span className="block truncate text-[10.5px] font-extrabold text-slate-800">{container.label || "Container"}</span>
                    <ContainerTypeBadge type={vesselType} className="mt-1 max-w-full" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
