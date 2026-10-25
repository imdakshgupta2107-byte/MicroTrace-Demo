import { describe, expect, it } from "vitest";
import { buildDemoStore } from "@/demo/seed";
import { acknowledgeHandover, createIndent, createReceipt, decideIndent, getRegisters, prepareHandover, recountAndInvestigate, resolveInvestigation, reviewClosure, startBlindCount, submitBlindCount, submitClosure, usableStock, verifyReceipt, type DemoRoot } from "@/registers/ledger";
import type { ControlActor } from "@/registers/types";

const day = new Date(2026, 9, 15, 12);
const student: ControlActor = { name: "Aarav Sharma", role: "student" };
const teacher: ControlActor = { name: "Dr. Sameer Kulkarni", role: "teacher" };
const staff: ControlActor = { name: "Ms. Rupali Patil", role: "staff" };
const reviewer: ControlActor = { name: "Principal Reviewer", role: "principal" };
const principal: ControlActor = { name: "Dr. Anjali Deshmukh", role: "principal" };
const root = (): DemoRoot => JSON.parse(JSON.stringify(buildDemoStore(day))) as DemoRoot;

describe("offline verification register ledger", () => {
  it("keeps issue acknowledgement and session closure as one movement, restoring only an approved return", () => {
    let state = root();
    const before = usableStock(state, "it-10");
    state = createIndent(state, student, { kind: "issue", item_id: "it-10", qty: 7, purpose: "T.Y. B.Sc. microscopy practical", department: "T.Y. B.Sc." });
    const indent = getRegisters(state).indents[0];
    state = decideIndent(state, staff, indent.id, "approved", 5, "Issue in two labelled portions.");
    state = prepareHandover(state, staff, indent.id, 5);
    const handover = getRegisters(state).handovers[0];
    expect(usableStock(state, "it-10")).toBe(before); // prepared is not issued
    state = acknowledgeHandover(state, student, handover.id);
    expect(usableStock(state, "it-10")).toBe(before - 5);
    state = submitClosure(state, student, handover.id, { used: 2, returned: 1, waste: 1, remaining: 1, safeReturn: true });
    const closure = getRegisters(state).closures[0];
    state = reviewClosure(state, staff, closure.id, "Return inspected as unused and dry.");
    expect(usableStock(state, "it-10")).toBe(before - 4); // one return only; use/waste are not deducted again
    expect(getRegisters(state).handovers[0].status).toBe("closed");
  });

  it("requires an independent verifier before a GRN posts accepted stock", () => {
    let state = root();
    const before = usableStock(state, "it-11");
    state = createIndent(state, teacher, { kind: "purchase", item_id: "it-11", qty: 4, purpose: "Media preparation demonstration", department: "Microbiology" });
    const indent = getRegisters(state).indents[0];
    state = decideIndent(state, staff, indent.id, "approved", 4, "Approved for control test.");
    state = createReceipt(state, staff, { indent_id: indent.id, item_id: "it-11", invoice_no: "INV-41", supplier: "Demo Supplier", batch: "B-41", expiry: "2027-12-31", delivered_qty: 4, accepted_qty: 3, method: "pack-count", note: "One pack damp." });
    const receipt = getRegisters(state).receipts[0];
    expect(usableStock(state, "it-11")).toBe(before);
    expect(() => verifyReceipt(state, staff, receipt.id, true, "Self verification")).toThrow(/cannot independently verify/i);
    state = verifyReceipt(state, principal, receipt.id, true, "Invoice, batch and pack count checked.");
    expect(usableStock(state, "it-11")).toBe(before + 3);
    expect(getRegisters(state).receipts[0]).toMatchObject({ status: "short_received", verified_by: principal.name });
  });

  it("does not adjust a mismatch until the separately recorded principal resolution", () => {
    let state = root();
    const before = usableStock(state, "it-18");
    state = startBlindCount(state, staff, "it-18", "Glassware cabinet");
    const count = getRegisters(state).counts[0];
    state = submitBlindCount(state, staff, count.id, Math.max(0, before - 2));
    expect(getRegisters(state).counts[0].status).toBe("recount_required");
    state = recountAndInvestigate(state, reviewer, count.id, Math.max(0, before - 2), "Counted each labelled rack twice.");
    const investigation = getRegisters(state).investigations[0];
    expect(usableStock(state, "it-18")).toBe(before); // no automatic balance rewrite
    state = resolveInvestigation(state, principal, investigation.id, { cause: "entry-error", note: "Opening count was transcribed incorrectly; signed recount retained.", postAdjustment: true });
    expect(usableStock(state, "it-18")).toBe(Math.max(0, before - 2));
    expect(getRegisters(state).investigations[0].status).toBe("adjusted");
    expect(getRegisters(state).control_audit[0].action).toContain("Authorised reconciliation adjustment");
  });
});
