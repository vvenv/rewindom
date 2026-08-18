import { describe, expect, it } from "vitest";

import { partitionSiteAssetFiles } from "./site-asset-files.js";

function file(name: string, type: string): File {
  return new File(["x"], name, { type });
}

describe("partitionSiteAssetFiles", () => {
  it("keeps common image types even when MIME is blank", () => {
    const { accepted, rejected } = partitionSiteAssetFiles([
      file("logo.svg", ""),
      file("hero.webp", ""),
      file("notes.pdf", "application/pdf"),
    ]);
    expect(accepted.map((item) => item.name)).toEqual(["logo.svg", "hero.webp"]);
    expect(rejected.map((item) => item.name)).toEqual(["notes.pdf"]);
  });
});
