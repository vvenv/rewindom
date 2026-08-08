import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { enhanceForms } from "./form.js";

describe("enhanceForms", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="marketing-site-root" data-page-path="/contact" data-page-locale="en">
        <form class="site-form" data-section-id="sec-1" data-success-message="Thanks">
          <div class="form-grid">
            <div class="form-field">
              <label for="f-name">Name<span class="form-req">*</span></label>
              <input id="f-name" name="name" type="text" required />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn" type="submit">Send</button>
          </div>
        </form>
      </div>
    `;
    enhanceForms();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("本地必填失败时不发请求", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const form = document.querySelector("form.site-form")!;
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(form.querySelector(".form-error")?.textContent).toBe("Required");
  });

  it("提交成功后换成 success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { submitted: true } }),
      }),
    );
    const form = document.querySelector("form.site-form")!;
    const input = form.querySelector<HTMLInputElement>("input[name=name]")!;
    input.value = "Ada";
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => {
      expect(document.querySelector(".form-success")?.textContent).toBe(
        "Thanks",
      );
    });
  });
});
