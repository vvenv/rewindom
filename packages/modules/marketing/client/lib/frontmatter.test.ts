import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "./frontmatter.js";

describe("parseFrontmatter", () => {
  it("splits frontmatter keys from the body", () => {
    const parsed = parseFrontmatter(
      ["---", "slug: quickstart", "title: 快速开始", "---", "", "# 正文"].join(
        "\n",
      ),
    );

    expect(parsed.data).toEqual({ slug: "quickstart", title: "快速开始" });
    expect(parsed.body).toBe("# 正文");
  });

  it("keeps colons inside values", () => {
    const parsed = parseFrontmatter(
      ["---", "description: 启动：先跑 pnpm setup", "---", "body"].join("\n"),
    );

    expect(parsed.data.description).toBe("启动：先跑 pnpm setup");
  });

  it("strips matching quotes", () => {
    const parsed = parseFrontmatter(
      ["---", 'title: "带 # 号的标题"', "---", "body"].join("\n"),
    );

    expect(parsed.data.title).toBe("带 # 号的标题");
  });

  it("treats a document without frontmatter as pure body", () => {
    const parsed = parseFrontmatter("# 没有 frontmatter\n");

    expect(parsed.data).toEqual({});
    expect(parsed.body).toBe("# 没有 frontmatter");
  });

  it("handles CRLF line endings", () => {
    const parsed = parseFrontmatter("---\r\nslug: a\r\n---\r\nbody");

    expect(parsed.data).toEqual({ slug: "a" });
    expect(parsed.body).toBe("body");
  });
});
