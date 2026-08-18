# 文件存储（媒体库 / 图片上传）

字节落在哪里，由**一个接口**说了算：`FileStorageProvider`
（`packages/server-kernel/src/infra/file-storage/`）。业务侧（官网媒体库资源、
后续的附件）只见到这个接口，本地磁盘还是 S3 兼容存储（Cloudflare R2 / AWS S3）
由 `ATTACHMENT_STORAGE` 决定。

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

| 业务       | 键                                        | 位置                                     |
| ---------- | ----------------------------------------- | ---------------------------------------- |
| 官网媒体库 | `{tenant_id}/site-assets/{asset_id}{ext}` | `marketing/server/site-asset.service.ts` |
| 官网 webfont | `platform/site-fonts/{file}` | 产品自托管切片，不是租户上传；`apps/server/scripts/sync-site-fonts-to-s3.ts` 写入 |

租户上传一律以 `tenant_id` 打头，迁移和按租户清理时才好下手。`platform/` 前缀留给
产品自己的公开资产（目前只有 webfont），不要把租户文件写进去。

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
对工作台的同源 XSS，只要骗到一次直接访问资源 URL 或把它塞进 iframe。媒体库收 SVG
（站点 logo / favicon 也从媒体库来），这条路得管。

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

## 接 Cloudflare R2（S3 兼容）

实现：`infra/file-storage/s3-file-storage.ts`。`ATTACHMENT_STORAGE=s3` 或 `r2`
走同一套；业务代码不用改。

### 环境变量

| 变量                                        | 说明                                                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ATTACHMENT_STORAGE`                        | `local`（默认）/ `s3` / `r2`                                                                                                                         |
| `S3_ENDPOINT`                               | R2：`https://<account_id>.r2.cloudflarestorage.com`（`r2` 必填）                                                                                     |
| `S3_REGION`                                 | 默认 `auto`（R2 要求这个占位）                                                                                                                       |
| `S3_BUCKET`                                 | bucket 名                                                                                                                                            |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | R2 API Token                                                                                                                                         |
| `S3_PUBLIC_BASE_URL`                        | 公开读的 CDN / `pub-*.r2.dev` / 自定义域（不要尾斜杠）。设了之后 `resolveUrl()` 返回直链，`sendStorageObject` 对公开资源 **302**；不设则应用转发字节 |

生产 compose 已透传上述键。本地开发可继续 `local`；只把生产 `.env.production` 切到 R2。

### R2 侧

1. 建 bucket，创建 **Object Read & Write** API Token，记下 Access Key。
2. 公开读：Dashboard 开 r2.dev，或绑自定义域（推荐独立媒体域，与站点不同源，SVG XSS 被源隔离）。
3. 自定义域上用 Transform Rule 补 `X-Content-Type-Options: nosniff` 和与 `sendStorageObject` 同等的 CSP（直链 302 后应用加不了这些头）。
4. **webfont**：产品切片用 `platform/site-fonts/`（`sync-site-fonts-to-s3.ts`）。
   公开页默认仍从同源 `/assets/site-fonts/` 加载，避免 `@font-face` 跨源 CORS。
   若要把公开页改到 CDN，bucket 必须允许租户 Origin 的 `GET`（图片 `<img>` 不需要 CORS，字体需要），
   再把 SSR 接到 `themeFontCdnDir(S3_PUBLIC_BASE_URL)`。

### 存量文件

库里存的是存储键不是绝对路径。把 `data/attachments/`（生产容器 `/data/attachments`）同步到 bucket 同名 key：

```bash
pnpm --filter server exec tsx scripts/sync-attachments-to-s3.ts --dry-run
pnpm --filter server exec tsx scripts/sync-attachments-to-s3.ts
```

脚本读本地磁盘、写 S3_* 配置的 bucket，与当前 `ATTACHMENT_STORAGE` 无关——可以先搬再切。
