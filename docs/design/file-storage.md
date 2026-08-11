# 文件存储（媒体库 / 图片上传）

字节落在哪里，由**一个接口**说了算：`FileStorageProvider`
（`packages/server-kernel/src/infra/file-storage/`）。业务侧（官网媒体库、租户品牌
资源、后续的附件）只见到这个接口，本地磁盘还是 OSS/S3 由 `ATTACHMENT_STORAGE` 决定。

## 接口

```ts
interface FileStorageProvider {
  put(storageKey, buffer, { mime_type, visibility }): Promise<void>;
  open(storageKey): Promise<FileStorageObject | null>; // 不存在返回 null，不抛
  delete(storageKey): Promise<void>; // 幂等
  resolveUrl(storageKey): Promise<string | null>; // 直链；本地返回 null
}
```

**接口里不出现本地磁盘的概念**——没有绝对路径、没有 `fs.Stats`、没有同步流。这一条是
硬约束：之前接口漏了个 `resolveAbsolutePath()`，两个调用方立刻绕过抽象自己
`fs.stat`，抽象就名存实亡了。要加能力就加在接口上，别开后门。

`open()` 一次返回流 + 字节数：对象存储的 `GetObject` 本来就同时给
`ContentLength`，拆成 stat + get 会白白多一次往返。

## 读路径：`sendStorageObject`

公开资源统一走 `packages/server-kernel/src/http/send-storage-object.ts`：

1. `resolveUrl()` 有值 → `302` 过去，让 CDN / 对象存储自己扛流量；
2. 没有（本地磁盘）→ 服务端转发字节；
3. 对象不存在 → 返回 `false`，路由发自己的 404 错误码。

图片是站点里请求量最大的一类资源。接对象存储的**主要收益就是第 1 条**：不再让每一张
图逐字节穿过 Node 进程。所以新的公开资源路由一律用这个 helper，别自己 `reply.send(stream)`。

## 存储键

存储键由**业务侧**拼，内核不认识任何业务概念：

| 业务         | 键                                     | 位置                        |
| ------------ | -------------------------------------- | --------------------------- |
| 官网媒体库   | `{tenant_id}/site-assets/{asset_id}{ext}` | `marketing/server/site-asset.service.ts` |
| 租户品牌资源 | `{tenant_id}/branding/{logo\|favicon}{ext}` | `platform/server/services/tenant-branding.service.ts` |

一律以 `tenant_id` 打头，迁移和按租户清理时才好下手。

扩展名走 `lib/mime.ts` 的 `mimeTypeToExtension` / `extensionToMimeType`：写入时按 MIME
定扩展名、公开 URL 回读时按扩展名反推 MIME，**两张表必须严格互逆**，否则上传成功、
回读 404。

## 写路径：`validateImageUpload`

`lib/image-upload.ts` 是「什么算一张可接受的图片」的唯一答案（白名单 + 大小 + 规范化
MIME + SVG 消毒），错误码由调用方给（各域 i18n key 不同）。

它返回的 `buffer` **才是该落盘的字节**——SVG 会被改写。调用方别再用自己手上那份原始
buffer，尺寸解析、`size_bytes` 也都要用返回的这份。

## SVG 是可执行文档

SVG 是唯一一种「图片即代码」的上传类型：`<script>`、`on*` 事件、`javascript:` URL 都会在
**提供它的那个源**上执行。租户站点的源同时挂着 `/app/*` 工作台，所以一张恶意 SVG =
对工作台的同源 XSS，只要骗到一次直接访问资源 URL 或把它塞进 iframe。媒体库和品牌
资源（logo / favicon）都收 SVG，两条路都得管。

两道防线：

1. **上传时消毒**（`lib/svg-sanitize.ts`）：DOMPurify + jsdom，SVG profile 白名单，
   额外禁掉 `foreignObject`（往 SVG 里塞任意 HTML 的常见跳板）。按 `image/svg+xml`
   进出，保证输出仍是良构 XML——浏览器对这个 MIME 走 XML 解析器，不良构就显示
   parser error。消毒后不剩根元素的，直接拒收（`*.unsafe_svg`）。
   
   **不要改成正则剥标签**：SVG 是 XML，实体编码、CDATA、命名空间、畸形标记的浏览器
   容错恢复，每一样都能绕过字符串过滤。攻击载荷用例见 `svg-sanitize.test.ts`。
   
   jsdom 按需 `await import()`，不进启动路径。

2. **提供时加固**（`sendStorageObject`）：`Content-Security-Policy: default-src 'none';
   img-src data:; style-src 'unsafe-inline'; sandbox` + `X-Content-Type-Options: nosniff`。
   管的是存量文件和消毒漏网的。

⚠️ 走直链 302 之后第 2 道就失效了——内容由对象存储/CDN 直接回。接 OSS/S3 时必须在
bucket / CDN 侧配同等的 CSP 与 nosniff，或者（更好）把用户内容放到**独立域名**上，
让它天然不同源。

## 接 OSS / S3 要做什么

1. 加 `infra/file-storage/s3-file-storage.ts`，实现上面 4 个方法；
2. 在 `infra/file-storage/index.ts` 的 `createFileStorageProvider` 加一个 `case`；
3. `lib/config.ts` 的 `buildStorageConfig()` 里补 endpoint / bucket / 凭据 env，
   并加进 `scripts/check-prod-app-env.mjs` 的透传清单；
4. `resolveUrl()` 返回 CDN 直链（`visibility: "public"`）或预签名 URL。

业务代码一行不用改。存量文件需要一次性搬迁——库里存的是存储键不是绝对路径，
把 `data/attachments/` 整个同步到 bucket 同名 key 即可。
