import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimersTool } from "@/workbench/tools/timers";

describe("timer state updates are pure", () => {
  it("counts down and finishes in StrictMode without render-phase setState warnings", () => {
    vi.useFakeTimers();
    const errors = vi.spyOn(console, "error");
    render(<StrictMode><TimersTool /></StrictMode>);
    fireEvent.change(screen.getByLabelText("Minutes"), { target: { value: "0.01" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText("done!")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(errors.mock.calls).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Reset timer" }));
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
  });
});
