import { describe, expect, it } from "vitest";

import { snapshotInputFiles } from "./text-attachment-upload.js";

describe("snapshotInputFiles", () => {
  it("snapshots files before clearing the input value", () => {
    const file = new File(["hello"], "test.txt", { type: "text/plain" });
    const input = document.createElement("input");
    input.type = "file";

    Object.defineProperty(input, "files", {
      configurable: true,
      get: () => ({
        0: file,
        length: 1,
        item: (index: number) => (index === 0 ? file : null),
      }),
    });

    const files = snapshotInputFiles(input);

    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe("test.txt");
    expect(input.value).toBe("");
  });
});
