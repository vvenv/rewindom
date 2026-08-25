import { describe, expect, it } from "vitest";

import { parseGeneratedContent } from "./content-generate.service.js";

describe("parseGeneratedContent", () => {
  it("reads title, body, and tags", () => {
    expect(
      parseGeneratedContent(
        JSON.stringify({
          title: " Spring walk ",
          body: "Sunlight on the street.\n\n#walk #city",
          tags: ["#walk", "city", ""],
        }),
      ),
    ).toEqual({
      title: "Spring walk",
      body: "Sunlight on the street.\n\n#walk #city",
      tags: ["walk", "city"],
    });
  });

  it("rejects missing body", () => {
    expect(() => parseGeneratedContent(JSON.stringify({ title: "x" }))).toThrow(
      "missing_fields",
    );
  });
});
