import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardActionCard } from "@/components/ui/dashboard-action-card";
import { StatCard } from "@/components/ui/stat-card";
import { Launcher, TOOLS } from "@/workbench/launcher";

describe("actionable dashboard and workbench surfaces", () => {
  it("renders every metric as a keyboard-native route or button target", () => {
    const updateView = vi.fn();
    const { rerender } = render(
      <MemoryRouter><StatCard label="Inventory items" value={12} to="/chemicals" /></MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Open Inventory items: 12" })).toHaveAttribute("href", "/chemicals");

    rerender(<MemoryRouter><StatCard label="Upcoming reservations" value={3} onClick={updateView} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open Upcoming reservations: 3" }));
    expect(updateView).toHaveBeenCalledOnce();
  });

  it("makes dashboard summary panels complete route targets", () => {
    render(
      <MemoryRouter>
        <DashboardActionCard to="/requests" label="Open requests needing action">Summary</DashboardActionCard>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Open requests needing action" })).toHaveAttribute("href", "/requests");
  });

  it("makes every benchtop tool tile a semantic button that opens its matching tool", () => {
    const onPick = vi.fn();
    render(<Launcher onPick={onPick} />);
    expect(screen.getAllByRole("button", { name: /Open .+:/ })).toHaveLength(TOOLS.length);

    fireEvent.click(screen.getByRole("button", { name: /Open Media prep:/ }));
    expect(onPick).toHaveBeenCalledWith("media-prep");
  });
});
