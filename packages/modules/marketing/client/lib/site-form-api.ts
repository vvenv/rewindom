/**
 * 公开表单的提交口。
 *
 * 不走 `api`（client-kit 那层带工作台的鉴权头与错误吐司）：这是**访客**在租户站点上
 * 发的请求，没有会话，报错也该由段自己就地显示，不该弹工作台的吐司。
 */

import type { FormValues } from "../../shared/sections/form/fields.js";

export type SubmitFormResult =
  | { ok: true }
  /** `errors` 有值 = 服务端逐字段驳回；没有 = 整体失败（网络、限流、站点没发布）。 */
  | { ok: false; errors?: Record<string, string> };

export async function submitSiteForm(input: {
  path: string;
  section_id: string;
  values: FormValues;
}): Promise<SubmitFormResult> {
  try {
    const response = await fetch("/api/public/site/form", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => null)) as {
      fields?: Record<string, string>;
    } | null;
    return body?.fields ? { ok: false, errors: body.fields } : { ok: false };
  } catch {
    // 断网 / 被拦截：说不清哪个字段的问题，交给调用方给一句整体失败
    return { ok: false };
  }
}
