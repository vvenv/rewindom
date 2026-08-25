import { describe, expect, it } from "vitest";

import {
  absoluteImageUrl,
  articleImageProxyPath,
  decodeImageToken,
  encodeImageToken,
  isUsableImageUrl,
} from "./article-image.js";

describe("isUsableImageUrl", () => {
  it("accepts http(s) image addresses", () => {
    expect(isUsableImageUrl("https://cdn.example.com/hero.jpg")).toBe(true);
    // CDN 上大量图片没有扩展名，扩展名只用来排除，不当充分条件
    expect(isUsableImageUrl("https://res.example.com/image/upload/v1/abc")).toBe(
      true,
    );
  });

  /* 播客源的 enclosure 是 mp3，取回来是坏图；有些源把视频塞进 media:content。 */
  it("rejects things that are plainly not images", () => {
    expect(isUsableImageUrl("https://example.com/ep12.mp3")).toBe(false);
    expect(isUsableImageUrl("https://example.com/clip.mp4")).toBe(false);
    expect(isUsableImageUrl("https://example.com/paper.pdf")).toBe(false);
  });

  /* data: 是内联的副本，与「热链他们自己托管的文件」正相反。 */
  it("rejects data: and other protocols", () => {
    expect(isUsableImageUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isUsableImageUrl("file:///etc/passwd")).toBe(false);
    expect(isUsableImageUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects empty and malformed input", () => {
    expect(isUsableImageUrl(null)).toBe(false);
    expect(isUsableImageUrl(undefined)).toBe(false);
    expect(isUsableImageUrl("")).toBe(false);
    expect(isUsableImageUrl("not a url")).toBe(false);
  });
});

describe("absoluteImageUrl", () => {
  it("resolves a root-relative og:image against the page", () => {
    expect(
      absoluteImageUrl("/img/hero.png", "https://blog.example.com/posts/a"),
    ).toBe("https://blog.example.com/img/hero.png");
  });

  it("leaves an absolute address alone", () => {
    expect(
      absoluteImageUrl("https://cdn.example.com/a.jpg", "https://x.example/p"),
    ).toBe("https://cdn.example.com/a.jpg");
  });

  /* 半个地址在页面上就是一张裂图——补不出来就丢掉。 */
  it("drops what it cannot resolve into a usable image", () => {
    expect(absoluteImageUrl("", "https://x.example/p")).toBeNull();
    expect(absoluteImageUrl(null, "https://x.example/p")).toBeNull();
    expect(absoluteImageUrl("/ep.mp3", "https://x.example/p")).toBeNull();
  });
});

describe("image token", () => {
  it("round-trips an address", () => {
    const url = "https://cdn.example.com/a b/héro.jpg?w=1200&h=630";
    expect(decodeImageToken(encodeImageToken(url))).toBe(url);
  });

  it("is url-safe — no slashes or plus signs in the path segment", () => {
    const token = encodeImageToken(
      "https://cdn.example.com/????/////aaaa+bbbb.jpg",
    );
    expect(token).not.toContain("/");
    expect(token).not.toContain("+");
    expect(token).not.toContain("=");
  });

  /*
   * 代理的闸门是「这个 URL 我们真的采到过」（在路由里查库），但 token 自己
   * 也不该解出一个非 http(s) 的东西——那是白送一层 SSRF 尝试面。
   */
  it("refuses to decode a token that is not an http(s) image", () => {
    expect(decodeImageToken(encodeImageToken("file:///etc/passwd"))).toBeNull();
    expect(decodeImageToken("not-base64!!!")).toBeNull();
  });

  /*
   * 代理是公开无鉴权的端点，所以内网地址必须在 token 这一层就解不出来——
   * 不能只靠「我们采过它」那道库查。
   */
  it("refuses link-local, loopback and private targets", () => {
    for (const url of [
      "http://169.254.169.254/latest/meta-data/",
      "http://127.0.0.1:8080/a.png",
      "http://localhost/a.png",
      "http://10.0.0.5/a.png",
      "http://192.168.1.1/a.png",
      "http://172.16.0.9/a.png",
      "http://[fd00::1]/a.png",
    ]) {
      expect(decodeImageToken(encodeImageToken(url))).toBeNull();
      expect(isUsableImageUrl(url)).toBe(false);
    }
  });

  /* 172.32 不在私网段里，别把整个 172/8 一刀切掉。 */
  it("does not over-block addresses that only look private", () => {
    expect(isUsableImageUrl("http://172.32.0.1/a.png")).toBe(true);
    expect(isUsableImageUrl("https://11.0.0.1/a.png")).toBe(true);
  });

  it("builds the same-origin proxy path", () => {
    expect(articleImageProxyPath("https://cdn.example.com/a.jpg")).toBe(
      `/events/images/${encodeImageToken("https://cdn.example.com/a.jpg")}`,
    );
  });
});
