import { describe, expect, it } from "vitest";

import { escapeHtml, jsonLdScriptText } from "./html.js";

describe("jsonLdScriptText", () => {
  it("emits parseable JSON, not HTML entities", () => {
    const text = jsonLdScriptText({ "@type": "WebPage", name: "Acme" });
    expect(text).not.toContain("&quot;");
    expect(JSON.parse(text)).toEqual({ "@type": "WebPage", name: "Acme" });
  });

  it("keeps quotes in titles as JSON string escapes", () => {
    const text = jsonLdScriptText({
      name: 'OpenAI: "GPT-5" 发布',
    });
    expect(JSON.parse(text).name).toBe('OpenAI: "GPT-5" 发布');
  });

  it("does not let </script> break out of the tag", () => {
    const text = jsonLdScriptText({
      name: "</script><script>alert(1)",
    });
    expect(text).not.toContain("</script>");
    expect(text).not.toContain("<");
    expect(JSON.parse(text).name).toBe("</script><script>alert(1)");
  });
});

describe("escapeHtml", () => {
  it("escapes markup and quotes", () => {
    expect(escapeHtml(`<a href="x">`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;",
    );
  });
});
