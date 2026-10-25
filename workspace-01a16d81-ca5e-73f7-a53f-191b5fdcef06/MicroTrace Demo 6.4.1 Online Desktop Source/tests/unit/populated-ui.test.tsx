import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip } from "@/components/ui/tooltip";
import { fmtINR } from "@/lib/format";

describe("populated UI regressions", () => {
  it("does not put invisible overflowing hazard tooltips into the layout", () => {
    render(<Tooltip label="GHS08 — Health hazard / BSL"><span>hazard icon</span></Tooltip>);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(document.querySelector(".absolute")).toBeNull();
  });

  it("opens a bounded fixed tooltip and removes it when the page scrolls", () => {
    const label = "GHS08 — Health hazard / BSL";
    render(<Tooltip label={label}><span>hazard icon</span></Tooltip>);
    fireEvent.mouseEnter(screen.getByTitle(label));
    expect(screen.getByRole("tooltip")).toHaveStyle({ left: "12px", width: "240px" });
    expect(screen.getByRole("tooltip")).toHaveClass("fixed");
    fireEvent.scroll(window);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("does not round fractional vendor unit prices down to a misleading zero rupees", () => {
    expect(fmtINR(0.48, 2)).toBe("₹0.48");
    expect(fmtINR(2.36, 2)).toBe("₹2.36");
    expect(fmtINR(4900)).toBe("₹4,900");
  });
});
