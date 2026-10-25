import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryBadge } from "@/components/chemicals/category-badge";
import { ContainerTypeBadge } from "@/components/containers/container-type-badge";

describe("locked taxonomy badge contrast", () => {
  it("renders container labels with an explicit dark high-contrast foreground", () => {
    render(<ContainerTypeBadge type="volumetric_glassware" />);
    const badge = screen.getByLabelText("Container type: Volumetric glassware");
    expect(badge).toHaveStyle({ color: "rgb(15, 33, 66)" });
    expect(screen.getByText("Volumetric glassware")).toBeVisible();
  });

  it("applies the same readable treatment to item category labels", () => {
    render(<CategoryBadge category="growth_media" />);
    const badge = screen.getByLabelText("Category: Media Prep/Growth Media");
    expect(badge).toHaveStyle({ color: "rgb(15, 33, 66)" });
    expect(screen.getByText("Media Prep/Growth Media")).toBeVisible();
  });
});
