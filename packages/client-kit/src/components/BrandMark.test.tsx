import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandMark } from "./BrandMark.js";

describe("BrandMark", () => {
  it("falls back to Logo svg when src is empty", () => {
    const { container } = render(<BrandMark className="size-8" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders colorable mask when src is provided", () => {
    const src = "/api/public/tenants/acme/branding/logo";
    const { container } = render(<BrandMark src={src} alt="Acme" />);
    const mark = container.querySelector("[role='img']");
    expect(mark).not.toBeNull();
    expect(mark?.getAttribute("aria-label")).toBe("Acme");
    expect(mark?.className).toContain("bg-current");
    expect(mark?.style.maskImage).toBe(`url("${src}")`);
    expect(container.querySelector("img")).toBeNull();
  });
});
