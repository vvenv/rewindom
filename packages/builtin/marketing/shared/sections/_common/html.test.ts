import { describe, expect, it } from "vitest";

import { md } from "./html.js";

describe("md", () => {
  it("wraps GFM tables in .table-wrap via marked renderer", () => {
    const html = md("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toMatch(
      /<div class="table-wrap"><table>[\s\S]*<\/table>\s*<\/div>/,
    );
    expect(html.match(/<table>/g)).toHaveLength(1);
  });

  it("does not wrap non-table content", () => {
    expect(md("hello **world**")).not.toContain("table-wrap");
  });
});
