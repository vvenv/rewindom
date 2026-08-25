# content

外部模块：用图片、视频和文字生成笔记与文章。一期只做生成与编辑，不对接小红书 / 公众号发布。

## 定位

- 独立 workspace 包（`modules/content/`），包名 `@rewindom/content`
- 所有内核 API 通过 `@rewindom/module-sdk` 门面包访问
- 体裁用中立的 `note` / `article`，后续发布渠道再映射

## 结构

```
content/
├── MODULE.spec.yaml
├── prisma/schema.prisma      # Content + ContentAsset
├── shared/                   # API 类型、entitlement
├── server/                   # CRUD、素材上传、LLM 生成
└── client/
    ├── pages/contents.tsx
    ├── pages/content-detail.tsx
    ├── components/
    └── locales/
```

## 面划分

| 面     | 路由                                        | 目录      | 所需权限                                       |
| ------ | ------------------------------------------- | --------- | ---------------------------------------------- |
| 租户侧 | `/app/contents`、`/app/contents/:contentId` | `client/` | `contents.read`（写操作另需 `contents.write`） |

## 生成

`POST /api/contents/:content_id/generate` 立即把状态打成 `generating` 后返回；后台调用租户 LLM。图片以视觉输入喂给模型；视频只带文件名，不逐帧分析。未配置 API Key 时失败码 `content.llm_not_configured`。

进程重启后，超过 15 分钟仍为 `generating` 的记录会在 `onBoot` 标为失败。

## 常见改动

- 加发布渠道：走 `extend-module`，不要把平台 SDK 写进本包的生成路径
- 加素材类型：先扩 `CONTENT_ASSET_KINDS` 与 MIME 白名单（视频还要同步 `mime.ts`）

## 依赖

- `rbac`
- `audit`

## 如何单独测试

```bash
pnpm --filter @rewindom/content test
```
