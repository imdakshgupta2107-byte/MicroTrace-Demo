// compatibility — chemical storage-conflict detection.
import type { Chemical, Container, StorageGroup } from "./types";

const UNSAFE: [StorageGroup, StorageGroup, string][] = [
  ["flammable", "oxidizer", "oxidizers feed a fire"],
  ["acid", "base", "violent neutralisation risk"],
  ["acid", "oxidizer", "gas evolution risk"],
  ["flammable", "toxic", "toxic fumes on fire"],
];

export interface Conflict {
  location: string;
  pair: [StorageGroup, StorageGroup];
  why: string;
  chemicals: [string, string];
}

export function storageConflicts(chemicals: Chemical[], containers: Container[]): Conflict[] {
  const byLoc = new Map<string, Map<StorageGroup, string[]>>();
  const chemById = new Map(chemicals.map((c) => [c.id, c]));
  for (const ct of containers) {
    if (ct.state === "disposed" || ct.qty <= 0) continue;
    const chem = chemById.get(ct.chemical_id);
    if (!chem || chem.storage_group === "general") continue;
    if (!byLoc.has(ct.location)) byLoc.set(ct.location, new Map());
    const gmap = byLoc.get(ct.location)!;
    if (!gmap.has(chem.storage_group)) gmap.set(chem.storage_group, []);
    gmap.get(chem.storage_group)!.push(chem.name);
  }
  const out: Conflict[] = [];
  for (const [loc, gmap] of byLoc) {
    for (const [a, b, why] of UNSAFE) {
      if (gmap.has(a) && gmap.has(b)) {
        out.push({ location: loc, pair: [a, b], why,
          chemicals: [gmap.get(a)![0], gmap.get(b)![0]] });
      }
    }
  }
  return out;
}

/** per-new-item check used inside the chemical form */
export function wouldConflict(
  group: StorageGroup, location: string,
  chemicals: Chemical[], containers: Container[],
): string | null {
  if (group === "general") return null;
  return storageConflicts(
    [...chemicals, { name: "__tmp__", storage_group: group } as Chemical],
    [...containers, { chemical_id: "__tmp__", location, qty: 1, state: "sealed" } as Container],
  )[0]?.why ?? null;
}
