import { describe, expect, it } from "vitest";

import { ARTICLE_IMAGE_REPEAT_MAX } from "../../shared/article-image.js";

import { pickImageCandidate } from "./article-image.js";

function row(o: Partial<Parameters<typeof pickImageCandidate>[0][0]> = {}) {
  return {
    image_url: "https://cdn.example.com/a.jpg",
    source_name: "TechCrunch",
    source_kind: "news",
    url: "https://techcrunch.com/a",
    published_at: new Date("2026-08-19T10:00:00Z"),
    ...o,
  };
}

describe("pickImageCandidate", () => {
  it("returns null when nothing has a usable image", () => {
    expect(pickImageCandidate([])).toBeNull();
    expect(pickImageCandidate([row({ image_url: null })])).toBeNull();
    expect(
      pickImageCandidate([row({ image_url: "https://x.example/ep.mp3" })]),
    ).toBeNull();
  });

  /* 不能署名的图不该出现——服务端就挡掉，不留给渲染器判。 */
  it("skips a signal with no source name to credit", () => {
    expect(pickImageCandidate([row({ source_name: "   " })])).toBeNull();
  });

  /*
   * 一手来源（官方博客 / 发布页 / 状态页）的图最可能是它自己拍或画的，权属最干净。
   */
  it("prefers a first-party source over a news outlet", () => {
    const picked = pickImageCandidate([
      row({
        source_name: "Reuters",
        source_kind: "news",
        published_at: new Date("2026-08-19T09:00:00Z"),
        image_url: "https://cdn.reuters.example/a.jpg",
      }),
      row({
        source_name: "Cloudflare Blog",
        source_kind: "official",
        published_at: new Date("2026-08-19T11:00:00Z"),
        image_url: "https://blog.cloudflare.example/a.jpg",
      }),
    ]);
    // 一手来源即使发得更晚也赢
    expect(picked?.source_name).toBe("Cloudflare Blog");
  });

  /* 同为新闻源时取最早那条：后来跟进的报道更可能配一张通讯社图。 */
  it("falls back to the earliest signal among equals", () => {
    const picked = pickImageCandidate([
      row({
        source_name: "The Verge",
        published_at: new Date("2026-08-19T12:00:00Z"),
        image_url: "https://cdn.verge.example/a.jpg",
      }),
      row({
        source_name: "Reuters",
        published_at: new Date("2026-08-19T08:00:00Z"),
        image_url: "https://cdn.reuters.example/a.jpg",
      }),
    ]);
    expect(picked?.source_name).toBe("Reuters");
  });

  /*
   * 结果必须稳定：同一条事件每次渲染都得是同一张图，否则读者每刷新一次换一张。
   * 完全同分时按 URL 字典序兜底，不跟查询顺序走。
   */
  it("is stable when two candidates tie on everything", () => {
    const a = row({ image_url: "https://cdn.example.com/a.jpg" });
    const b = row({ image_url: "https://cdn.example.com/b.jpg" });
    expect(pickImageCandidate([a, b])?.image_url).toBe(
      pickImageCandidate([b, a])?.image_url,
    );
    expect(pickImageCandidate([b, a])?.image_url).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });

  /* 内网地址在这一层也不该被选出来（`isUsableImageUrl` 统一挡）。 */
  it("never picks a private target", () => {
    expect(
      pickImageCandidate([row({ image_url: "http://169.254.169.254/a.png" })]),
    ).toBeNull();
  });
});

/*
 * 去噪的两条判据在 `getEventArticleImage` 里（要查库），这里钉住阈值本身——
 * 改动它等于改动「什么算模板图」，不该被顺手调掉。
 */
describe("ARTICLE_IMAGE_REPEAT_MAX", () => {
  it("is 3 — two occurrences is still normal", () => {
    // 同一篇文章被源改稿后重新出现是常事，两条不足以定性
    expect(ARTICLE_IMAGE_REPEAT_MAX).toBe(3);
  });
});
