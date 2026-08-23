/**
 * 公开站的订阅提交（无 React）。
 *
 * 由 marketing 的 site-enhance 在构建期扫目录发现（导出名 `enhanceSite` 是约定），
 * 运行时拿到的 `context` 是当前页面的语言与路径快照——本模块不自己去认 marketing
 * 的 DOM 约定。
 *
 * **只有订阅入口依赖 JS，退订不依赖。** 退订走的是两张真 `<form method="post">` 的
 * SSR 页：读者退不掉订阅就只能点「举报垃圾邮件」，那会烧掉整个发信域的声誉。
 * 订阅则相反——没订上大不了再点一次，值得换取「不跳页、当场给回执」的体验。
 */
import type { SiteEnhanceContext } from "@rewindom/builtin/marketing/client/enhance/main.js";

const ZH = /^zh/iu;

function messages(locale: string): {
  invalid: string;
  failed: string;
  success: string;
  sending: string;
} {
  return ZH.test(locale)
    ? {
        invalid: "请填写正确的邮箱地址",
        failed: "提交失败，请稍后再试",
        success: "确认邮件已发出，请到收件箱点确认链接",
        sending: "提交中…",
      }
    : {
        invalid: "Enter a valid email address",
        failed: "Something went wrong. Please try again.",
        success: "Check your inbox and click the confirmation link",
        sending: "Sending…",
      };
}

function show(
  form: HTMLFormElement,
  text: string,
  tone: "error" | "success" | "",
): void {
  const node = form.querySelector<HTMLElement>("[data-newsletter-message]");
  if (!node) return;
  node.textContent = text;
  if (tone) node.setAttribute("data-tone", tone);
  else node.removeAttribute("data-tone");
}

async function submit(
  form: HTMLFormElement,
  context: SiteEnhanceContext,
): Promise<void> {
  const t = messages(context.locale);
  const input = form.querySelector<HTMLInputElement>('input[name="email"]');
  const email = input?.value.trim() ?? "";
  if (!email || !email.includes("@")) {
    show(form, t.invalid, "error");
    input?.focus();
    return;
  }

  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (button) button.disabled = true;
  show(form, t.sending, "");

  try {
    const response = await fetch(
      `/api/public/newsletter/subscribe?locale=${encodeURIComponent(context.locale)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          // 空串是有意义的值：表示「本站全部可订阅列表」，由服务端解析
          list_key: form.dataset.listKey || "",
          cadence: form.dataset.cadence || "weekly",
          source_path: context.pagePath,
        }),
      },
    );

    if (!response.ok) {
      /*
       * 服务端对「新订阅」与「早就订过了」一律回 202（防邮箱枚举），所以走到这里
       * 的都是真失败：邮箱不合法、限流、本站没配发信通道。能拿到 code 就说给用户听，
       * 拿不到就用通用文案——不要把 HTTP 状态码摊给访客看。
       */
      let text = t.failed;
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload?.error) text = payload.error;
      } catch {
        // 响应体不是 JSON（网关错误页之类），用通用文案
      }
      show(form, text, "error");
      return;
    }

    show(form, form.dataset.successMessage || t.success, "success");
    form.reset();
  } catch {
    show(form, t.failed, "error");
  } finally {
    if (button) button.disabled = false;
  }
}

export function enhanceSite(context: SiteEnhanceContext): void {
  /*
   * 事件委托挂在 document 上，而不是逐个 form 绑：段可以出现多次，
   * 也可能在别的增强脚本之后才进 DOM。
   */
  document.addEventListener("submit", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;
    if (!target.classList.contains("newsletter-subscribe")) return;
    event.preventDefault();
    void submit(target, context);
  });
}
