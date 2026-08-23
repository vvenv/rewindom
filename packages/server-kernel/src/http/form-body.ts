/**
 * `application/x-www-form-urlencoded` 的 body 解析器。
 *
 * Fastify 默认只认 `application/json` 与 `text/plain`——**任何真 `<form method="post">`
 * 的提交，在没登记这一条的作用域里都会被挡成 415 `FST_ERR_CTP_INVALID_MEDIA_TYPE`**，
 * 请求根本进不到 handler。公开面那些必须无 JS 也能用的表单（确认订阅、退订、会员登录、
 * 加购）全靠它。
 *
 * 尤其是邮件的一键退订：`List-Unsubscribe-Post` 是邮件服务商的服务器发来的
 * `List-Unsubscribe=One-Click` 表单 POST。挡掉它等于读者点了没反应，接着就是
 * 「举报垃圾邮件」——那会烧掉整个发信域的声誉。
 *
 * **登记在调用方自己的封装作用域里**（`app.register(plugin)` 里的那个 `app`）：
 * 同一个作用域上重复登记同一种 content-type 会抛 `FST_ERR_CTP_ALREADY_PRESENT`，
 * 所以不能在组装层一次性挂给所有路由，得由每个提供表单页的插件各自调一次。
 */

import type { FastifyInstance, FastifyRequest } from "fastify";

/** 只用到 `addContentTypeParser`：调用方传插件作用域里的 `app` 即可。 */
type ContentTypeParserHost = Pick<FastifyInstance, "addContentTypeParser">;

export function registerFormBodyParser(app: ContentTypeParserHost): void {
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_request: FastifyRequest, body: string | Buffer, done) => {
      try {
        /*
         * 同名字段（退订页的多选框 `list_keys`）要保留全部值：`Object.fromEntries`
         * 只留最后一个，读者勾了三个列表就只退掉一个。
         */
        const params = new URLSearchParams(String(body));
        const parsed: Record<string, string | string[]> = {};
        for (const key of new Set(params.keys())) {
          const values = params.getAll(key);
          parsed[key] = values.length > 1 ? values : values[0];
        }
        done(null, parsed);
      } catch (error) {
        done(error as Error);
      }
    },
  );
}
