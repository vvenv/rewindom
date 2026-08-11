import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandMark } from "./BrandMark.js";

describe("BrandMark", () => {
  it("falls back to Logo svg when src is empty", () => {
    const { container } = render(<BrandMark className="size-8" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders img when src is provided", () => {
    const src = "/api/public/tenants/acme/branding/logo";
    const { container } = render(<BrandMark src={src} alt="Acme" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(src);
    expect(img?.getAttribute("alt")).toBe("Acme");
    expect(img?.className).toContain("object-contain");
  });
});
