import { describe, expect, it } from "vitest";

import { sanitizeSvg } from "./svg-sanitize.js";

const CLEAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="#09f"/></svg>`;

describe("sanitizeSvg", () => {
  it("keeps a normal icon intact", () => {
    const out = sanitizeSvg(CLEAN_SVG);
    expect(out).toContain("<path");
    expect(out).toContain('d="M4 4h16v16H4z"');
    expect(out).toContain('fill="#09f"');
    expect(out).toContain('viewBox="0 0 24 24"');
  });

  it("keeps the xmlns so the result still parses as image/svg+xml", () => {
    expect(sanitizeSvg(CLEAN_SVG)).toContain(
      'xmlns="http://www.w3.org/2000/svg"',
    );
  });

  it.each([
    [
      "script element",
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>`,
    ],
    [
      "script in CDATA",
      `<svg xmlns="http://www.w3.org/2000/svg"><script><![CDATA[alert(1)]]></script></svg>`,
    ],
    [
      "onload handler",
      `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle r="5"/></svg>`,
    ],
    [
      "onerror on a child",
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="x" onerror="alert(1)"/></svg>`,
    ],
    [
      "javascript: href",
      `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>x</text></a></svg>`,
    ],
    [
      "animate to a javascript: url",
      `<svg xmlns="http://www.w3.org/2000/svg"><a><animate attributeName="href" values="javascript:alert(1)"/></a></svg>`,
    ],
    [
      "foreignObject smuggling html",
      `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject></svg>`,
    ],
    [
      "embedded html handler",
      `<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="onmouseover" to="alert(1)"/></svg>`,
    ],
  ])("strips %s", (_label, payload) => {
    const out = sanitizeSvg(payload) ?? "";
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toMatch(/\son\w+\s*=/i);
    expect(out).not.toMatch(/<foreignObject/i);
    expect(out).not.toMatch(/alert\(/i);
  });

  it("rejects markup that is not an SVG at all", () => {
    expect(sanitizeSvg("<html><body>nope</body></html>")).toBeNull();
    expect(sanitizeSvg("")).toBeNull();
    expect(sanitizeSvg("not xml")).toBeNull();
  });

  it("rejects an SVG whose only content was the payload", () => {
    // 消毒后连根都不剩的输入不该当成「一张空图」存下来
    expect(sanitizeSvg("<script>alert(1)</script>")).toBeNull();
  });
});
