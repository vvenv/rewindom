import { describe, expect, it } from "vitest";

import {
  buildPolicy,
  inlineScripts,
  inlineStyles,
  renderConf,
  sha256Source,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error —— 生成器是构建期脚本（.mjs），没有类型声明；这里只测行为
} from "../scripts/gen-csp.mjs";

/*
 * 期望值写成常量而不是现算：这条测试要钉住的正是**摘要口径**
 * （sha256 + base64 + 对内容原文不做裁剪）。现算的话两边用同一套逻辑，
 * 口径一起错了也测不出来。
 */
const HASH_OF_A = "'sha256-qVpDBgj7bpq5hMAcGp3AOc79J3Y1Z4HvySTwKrWDoy4='";
const HASH_OF_B = "'sha256-cf242PFc/kb7xD0Qzhsmd9vvRkc+cWFmbi+k+YvtdKc='";
const HASH_OF_PADDED = "'sha256-gnCj+fodg7uwg3vF3ej9NucTb/Ycq9C8s6BbDEwThr4='";
const HASH_OF_STYLE = "'sha256-AYkV/wUaXEz1i9pndN1veIXFHZVFTj4Ojce2rMK7bSc='";

function policyOf(html: string): string {
  return buildPolicy(html) as string;
}

function directive(policy: string, name: string): string {
  return policy.split("; ").find((part: string) => part.startsWith(`${name} `)) ?? "";
}

describe("应用壳层 CSP 生成器", () => {
  it("只收内联 script，带 src 的不算", () => {
    const html = `
      <script src="/assets/a.js"></script>
      <script>console.log(1)</script>
      <script type="module" src="/assets/b.js"></script>
      <script defer>console.log(2)</script>
    `;

    expect(inlineScripts(html)).toEqual(["console.log(1)", "console.log(2)"]);
  });

  it("hash 是 sha256 + base64，且对内容原文不做裁剪", () => {
    expect(sha256Source("a()")).toBe(HASH_OF_A);
    expect(sha256Source("  console.log(1)\n")).toBe(HASH_OF_PADDED);
  });

  it("每个内联脚本都进 script-src，且不含 unsafe-inline", () => {
    const scriptSrc = directive(
      policyOf("<script>a()</script><script>b()</script>"),
      "script-src",
    );

    expect(scriptSrc).toContain(HASH_OF_A);
    expect(scriptSrc).toContain(HASH_OF_B);
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  /*
   * 壳层有五处在运行时 createElement("style")（见生成器文件头的清单），
   * 收紧 style-src 会让主题、预览和翻译挂件一起坏。这条测试是那个取舍的锚点：
   * 真要收紧，得先改掉那五处，然后这条测试跟着改。
   */
  it("style-src 明确保留 unsafe-inline", () => {
    expect(directive(policyOf("<script>a()</script>"), "style-src")).toContain(
      "'unsafe-inline'",
    );
  });

  it("内联 style 也按 hash 列出（构建产物当前没有，但写法变了要跟上）", () => {
    expect(policyOf("<style>.a{color:red}</style>")).toContain(HASH_OF_STYLE);
    expect(inlineStyles("<style>.a{color:red}</style>")).toEqual([".a{color:red}"]);
  });

  it("锁死几条不该松的指令", () => {
    const policy = policyOf("");

    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("frame-ancestors 'self'");
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("connect-src 'self'");
  });

  it("租户外链图片与附件预览要放行（否则 logo / 预览图全裂）", () => {
    const imgSrc = directive(policyOf(""), "img-src");

    expect(imgSrc).toContain("https:");
    expect(imgSrc).toContain("blob:");
    expect(imgSrc).toContain("data:");
  });

  it("产出的是 nginx add_header 一行，且带 always", () => {
    const conf = renderConf("default-src 'self'", 1) as string;

    expect(conf).toContain(
      "add_header Content-Security-Policy \"default-src 'self'\" always;",
    );
    expect(conf).toContain("不要手改");
  });
});
