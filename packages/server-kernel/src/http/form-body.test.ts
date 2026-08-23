/**
 * 公开面的表单页全靠这一条解析器（回归）。
 *
 * 曾经的现场：订阅确认页的 `<form method="post">` 提交回
 * `{"error":"Unsupported Media Type","code":"FST_ERR_CTP_INVALID_MEDIA_TYPE"}`——
 * 那条路由所在的插件作用域没登记 urlencoded 解析器，请求根本没进 handler。
 */
import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { registerFormBodyParser } from "./form-body.js";

async function appWithEcho(options: { parser: boolean }) {
  const app = Fastify({ logger: false });
  await app.register(async (scoped) => {
    if (options.parser) registerFormBodyParser(scoped);
    scoped.post("/echo", async (request) => ({ body: request.body }));
  });
  await app.ready();
  return app;
}

const form = {
  method: "POST" as const,
  url: "/echo",
  headers: { "content-type": "application/x-www-form-urlencoded" },
};

describe("表单 body 解析器", () => {
  it("没登记就是 415——读者点「确认订阅」看到的是一段报错 JSON", async () => {
    const app = await appWithEcho({ parser: false });
    const res = await app.inject({ ...form, payload: "token=abc" });
    expect(res.statusCode).toBe(415);
    expect(res.json().code).toBe("FST_ERR_CTP_INVALID_MEDIA_TYPE");
    await app.close();
  });

  it("登记之后表单字段进得了 handler", async () => {
    const app = await appWithEcho({ parser: true });
    const res = await app.inject({
      ...form,
      payload: "token=abc&email=a%40b.com",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().body).toEqual({ token: "abc", email: "a@b.com" });
    await app.close();
  });

  it("同名字段保留全部值——退订页勾了三个列表就得退三个", async () => {
    const app = await appWithEcho({ parser: true });
    const res = await app.inject({
      ...form,
      payload: "token=t&list_keys=a&list_keys=b&list_keys=c",
    });
    expect(res.json().body).toEqual({
      token: "t",
      list_keys: ["a", "b", "c"],
    });
    await app.close();
  });

  it("一键退订那种只有一个字段的 body 也认", async () => {
    // `List-Unsubscribe-Post` 是邮件服务商的服务器发来的，body 就这一行
    const app = await appWithEcho({ parser: true });
    const res = await app.inject({
      ...form,
      payload: "List-Unsubscribe=One-Click",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().body).toEqual({ "List-Unsubscribe": "One-Click" });
    await app.close();
  });

  it("空 body 不炸", async () => {
    const app = await appWithEcho({ parser: true });
    const res = await app.inject({ ...form, payload: "" });
    expect(res.statusCode).toBe(200);
    expect(res.json().body).toEqual({});
    await app.close();
  });
});
