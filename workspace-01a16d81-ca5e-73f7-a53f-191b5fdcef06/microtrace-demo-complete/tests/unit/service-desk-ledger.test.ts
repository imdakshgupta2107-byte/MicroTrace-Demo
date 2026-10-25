import { describe, expect, it } from "vitest";
import { buildDemoStore } from "@/demo/seed";
import {
  completeDeskTicket, createDeskReport, createDeskRequest, endorseDeskRequirement,
  getServiceDesk, startDeskWork, acknowledgeDeskTicket,
} from "@/service-desk/ledger";
import type { DeskActor } from "@/service-desk/types";

const day = new Date(2026, 9, 15, 12);
const student: DeskActor = { name: "Aarav Sharma", role: "student" };
const teacher: DeskActor = { name: "Dr. Sameer Kulkarni", role: "teacher" };
const staff: DeskActor = { name: "Ms. Rupali Patil", role: "staff" };
const root = () => JSON.parse(JSON.stringify(buildDemoStore(day)));
const stock = (state: ReturnType<typeof root>, itemId: string) => state.containers.filter((row: { chemical_id: string; state: string }) => row.chemical_id === itemId && row.state !== "disposed").reduce((total: number, row: { qty: number }) => total + row.qty, 0);

describe("Lab Desk report versus request workflow", () => {
  it("records an issue report without changing stock, then requires an owned physical-review workflow", () => {
    let state = root();
    const before = stock(state, "it-01");
    state = createDeskReport(state, student, {
      category: "evaporation", priority: "routine", title: "Ethanol level below marked scale",
      detail: "Observed at the dispensing bench before class; bottle left in place for physical review.",
      location: "Bay 1 dispensing bench", related_item_id: "it-01",
    });
    const ticket = getServiceDesk(state).tickets[0];
    expect(ticket).toMatchObject({ channel: "report", status: "submitted", requester_role: "student" });
    expect(stock(state, "it-01")).toBe(before);
    state = acknowledgeDeskTicket(state, staff, ticket.id);
    state = startDeskWork(state, staff, ticket.id);
    state = completeDeskTicket(state, staff, ticket.id, "Bottle checked and moved to the controlled count queue.");
    expect(getServiceDesk(state).tickets[0].status).toBe("resolved");
    expect(stock(state, "it-01")).toBe(before);
  });

  it("requires teacher endorsement before staff can fulfil a student material requirement", () => {
    let state = root();
    const before = stock(state, "it-34");
    state = createDeskRequest(state, student, {
      category: "culture", priority: "routine", title: "E. coli culture for inoculation practical",
      detail: "Required for the Batch B inoculation exercise under the scheduled teaching plan.",
      location: "Culture preparation room", related_item_id: "it-34", qty: 1,
    });
    const ticket = getServiceDesk(state).tickets[0];
    expect(() => startDeskWork(state, staff, ticket.id)).toThrow(/teacher endorsement/i);
    state = endorseDeskRequirement(state, teacher, ticket.id, "Matches the planned Batch B practical.");
    expect(getServiceDesk(state).tickets[0]).toMatchObject({ status: "endorsed", endorsed_by: teacher.name });
    state = startDeskWork(state, staff, ticket.id);
    state = completeDeskTicket(state, staff, ticket.id, "Culture prepared; custody issue will be recorded separately at handover.");
    expect(getServiceDesk(state).tickets[0].status).toBe("fulfilled");
    expect(stock(state, "it-34")).toBe(before);
  });
});
