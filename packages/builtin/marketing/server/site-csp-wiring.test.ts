import { describe, expect, it, vi } from "vitest";

import { sendSiteHtml } from "./ssr.routes.js";

import type { FastifyReply } from "fastify";

/**
 * 这条不变量是整套 SSR CSP 的地基：**响应头里的 nonce 必须与 HTML 里的是同一个**。
 *
 * 对不上的后果很隐蔽——页面自己的内联脚本被自己的策略拦掉，而 report 模式下
 * 连报错都只出现在访客的控制台里。所以 nonce 只在 sendSiteHtml 里生成一次，
 * 同时交给渲染函数和响应头；这条测试守的就是「同时」。
 */
function fakeReply(): {
  reply: FastifyReply;
  headers: Record<string, string>;
  sent: string[];
} {
  const headers: Record<string, string> = {};
  const sent: string[] = [];
  const reply = {
    status: vi.fn().mockReturnThis(),
    header: vi.fn((name: string, value: string) => {
      headers[name.toLowerCase()] = value;
      return reply;
    }),
    send: vi.fn((body: string) => {
      sent.push(body);
      return reply;
    }),
  } as unknown as FastifyReply;
  return { reply: reply as FastifyReply, headers, sent };
}

function cspHeader(headers: Record<string, string>): string {
  return (
    headers["content-security-policy"] ??
    headers["content-security-policy-report-only"] ??
    ""
  );
}

describe("SSR 的 CSP 接线", () => {
  it("响应头里的 nonce 就是交给渲染函数的那个", () => {
    const { reply, headers, sent } = fakeReply();
    let handed = "";

    sendSiteHtml(reply, 200, (nonce) => {
      handed = nonce;
      return `<script nonce="${nonce}">a()</script>`;
    });

    expect(handed).not.toBe("");
    expect(cspHeader(headers)).toContain(`'nonce-${handed}'`);
    expect(sent[0]).toContain(`nonce="${handed}"`);
  });

  it("每次响应的 nonce 都不同", () => {
    const nonces: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const { reply } = fakeReply();
      sendSiteHtml(reply, 200, (nonce) => {
        nonces.push(nonce);
        return "";
      });
    }

    expect(new Set(nonces).size).toBe(3);
  });

  it("默认是 report-only：只报不拦", () => {
    const { reply, headers } = fakeReply();

    sendSiteHtml(reply, 200, () => "");

    expect(headers["content-security-policy-report-only"]).toBeDefined();
    expect(headers["content-security-policy"]).toBeUndefined();
  });

  it("站点的统计来源会进策略", () => {
    const { reply, headers } = fakeReply();

    sendSiteHtml(reply, 200, () => "", {
      analytics: {
        scripts: [
          { provider: "plausible", script_url: "https://stats.acme.com/s.js", site_id: "acme.com" },
        ],
      },
    });

    expect(cspHeader(headers)).toContain("https://stats.acme.com");
  });
});
