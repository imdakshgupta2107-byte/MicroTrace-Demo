import { beforeEach, describe, expect, it, vi } from "vitest";
import { audit, del, fetchAll, fetchLabData, insert, TABLES, update } from "@/lib/db";
import { DEMO_STORE_KEY } from "@/demo/config";

beforeEach(() => { localStorage.clear(); });

describe("zero-config offline inventory persistence", () => {
  it("keeps persistence independent from the once-only application seed", async () => {
    const snapshot = await fetchLabData();
    expect(Object.keys(snapshot)).toHaveLength(TABLES.length);
    for (const rows of Object.values(snapshot)) expect(rows).toEqual([]);
  });

  it("inserts and updates a chemical in persistent local storage", async () => {
    const chemical = await insert("chemicals", { name: "Ethanol", category: "Chemical", unit: "mL", min_stock: 100, ghs: [], storage_group: "flammable", ppe: "Gloves", supplier: "", notes: "", pubchem_cid: null });
    expect(chemical.id).toBeTruthy();
    await update("chemicals", chemical.id!, { name: "Ethanol 95%" });
    expect((await fetchAll("chemicals"))[0].name).toBe("Ethanol 95%");
    expect(JSON.parse(localStorage.getItem(DEMO_STORE_KEY)!).chemicals).toHaveLength(1);
  });

  it("deletes only the chosen record", async () => {
    const first = await insert("vendors", { name: "First", phone: "", email: "", address: "", notes: "" });
    await insert("vendors", { name: "Second", phone: "", email: "", address: "", notes: "" });
    await del("vendors", first.id!);
    expect((await fetchAll("vendors")).map((row) => row.name)).toEqual(["Second"]);
  });

  it("does not generate duplicate audit IDs for same-millisecond operations", async () => {
    vi.spyOn(Date, "now").mockReturnValue(123456);
    await Promise.all([audit("User", "First"), audit("User", "Second"), audit("User", "Third")]);
    const snapshot = await fetchLabData();
    expect(new Set(snapshot.audit.map((entry) => entry.id)).size).toBe(3);
  });

  it("records real audit metadata", async () => {
    await audit("Lab User", "Added container", "containers", "container-1");
    const snapshot = await fetchLabData();
    expect(snapshot.audit).toHaveLength(1);
    expect(snapshot.audit[0]).toMatchObject({ actor: "Lab User", action: "Added container", entity: "containers", entity_id: "container-1" });
    expect(snapshot.audit[0].created_at).toBeTruthy();
  });
});
