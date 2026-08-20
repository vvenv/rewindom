# rewindom-brand

rewindom.com（产品主域、默认租户）的品牌资产真源。

## 文件

| 文件 | 是什么 | 谁生成 |
| --- | --- | --- |
| `mark.svg` | 品牌标 / logo / favicon：玉玦本身，浅底 `#0369a1`、深底 `#38bdf8` | 手改 |
| `mark-mono.svg` | 单色版（`currentColor`），印刷 / 单色场景 | 手改，几何跟随 `mark.svg` |
| `og.png` | og:image / twitter:image，1200×630 | `generate.mjs` |
| `favicon-512.png` | favicon 的 PNG 兜底（透明底玉玦） | `generate.mjs` |
| `avatar-1024.png` | X / 微信公众号头像（满幅 accent、白玉玦） | `generate.mjs` |
| `apple-touch-icon.png` | 180×180，iOS 加到主屏 | `generate.mjs` |
| `maskable-512.png` | Android 自适应图标（字形收进安全区） | `generate.mjs` |
| `wordmark-light.png` | 横向字标，`#38bdf8` 标 + 白字，给深底 | `generate.mjs` |
| `wordmark-dark.png` | 横向字标，`#0369a1` 标 + 黑字，给浅底 | `generate.mjs` |
| `hero.jpg` | 首页首屏分栏配图，4:3 | 手出（不走 `generate.mjs`） |

**只手改 SVG**，位图一律重跑生成脚本：

```bash
pnpm --filter server exec node scripts/rewindom-brand/generate.mjs
```

各变体**不重抄路径**：脚本读 `mark.svg` 再做受控改写（换填色 / 铺平台底 / 缩字形），
`mark.svg` 的几何一旦重构会当场抛错，而不是悄悄出一张不对的图。

再写进站点（改 `theme_settings` 两列；**不**改 `chrome_brand.text_case`，
产品名保持混排；不发布其它草稿改动）：

```bash
pnpm --filter server exec tsx scripts/apply-rewindom-brand.ts --dry-run --slug rewindom
pnpm --filter server exec tsx scripts/apply-rewindom-brand.ts --slug rewindom
```

`seed-local-marketing-site.ts` 铺完产品站后会跟一次 apply，避免 `theme_settings`
整列覆盖把 logo 抹掉。

`apply-rewindom-brand.ts` 覆盖：

- `logo_url` / `favicon_url` / `og_image`
- `apple_touch_icon_url` / `maskable_icon_url`
- 首页（中英）hero 段的 `image` / `image_alt`
- `brand_font_family`（Inter）
- `primary_color`（`#0369a1`，可用 `--no-primary` 跳过）

其余几张的落地方式见下面「谁用哪张」。

## 谁用哪张

玉玦本身已有轮廓。圆角色块只出现在**平台会裁切**的那几张上，而且那层底是平台的画布，不是品牌容器：

| 场景 | 用哪张 | 为什么不能用别的 |
| --- | --- | --- |
| 官网页头 logo | `mark.svg` | 矢量、随 OS 明暗换色 |
| 浏览器标签页 | `mark.svg`（或 `favicon-512.png` 兜底） | 没有平台遮罩，标就是玉玦 |
| X / 微信公众号头像 | `avatar-1024.png` | 平台套圆形；透明底会被切成一圈空，必须铺满 |
| iOS 加到主屏 | `apple-touch-icon.png` | 同上，iOS 套圆角矩形 |
| Android 自适应图标 | `maskable-512.png` | 安全区是「中心 80% 直径的圆」，字形要再缩一档 |
| 公众号头图 / 演示稿 / 页脚 | `wordmark-*.png` | 透明底解决不了字色，深浅底各一张 |
| 首页首屏分栏 | `hero.jpg` | 4:3；Spec 对着站点预览，不是抽象光晕 |

工作台侧栏 / 登录页走 `packages/client-kit` 的 `Logo`（同一条 path、`currentColor`）。

**尚未接进代码**：无。`apple-touch-icon.png` / `maskable-512.png` 由
`apply-rewindom-brand.ts` 写入 `theme_settings`，SSR 在字段有值时分别输出
`<link rel="apple-touch-icon">` 与 `<link rel="manifest" href="/site.webmanifest">`。

## 设计口径

跟着官网和工作台当前的样子走，不另立一套：

- **形**：厚壁圆环顶开一条径向缝（玉玦）。产品口径（底座是闭合的环，缝是模块
  挂点——底座随业务成形）就是这个形，单一连通实心，缩到 16px 仍然是它自己。
- **为什么不是大写 R**：开发者工具图标堆里字母标没有轮廓，而玉玦已经是产品
  自己的形（工作台 Logo / `favicon.svg` / `docs/assets/logo.svg` 同一条 path）。
- **为什么不套圆角色块**：yestino 的标是一笔线，没有色块缩到 favicon 会消失，
  所以才造一层容器。玉玦已经是实心，再套方块会把 24px 页头收成「又一个 App 图标」，
  并和工作台那套身份打架。平台会裁切的图另铺 accent，那是平台要一块满幅画布。
- **主色**：浅底 `#0369a1`、深底 `#38bdf8`，就是 favicon.svg 那一组，不跨色相。
  `prefers-color-scheme` 只跟 OS；官网自己的明暗（`data-site-color-mode`）管不到
  `<img>` 里的 SVG。
- **尺寸下限是 24px**：官网页头 `.logo{height:1.5rem}`。所以环壁厚、缝够宽、
  不放分离的小元素。字形铺满 viewBox（外缘半径 108 / 半宽 128），不再预缩。
- **字体是一款，不是两款**：产品站 `font_family = inter`。字标和正文都走 Inter，
  用字重拉开层级（700 / 400）。不另配显示体——Newsreader 是资讯产品的编辑体，
  用在这里会把 Rewindom 收成又一个「衬线 SaaS」。
- **字标混排、不配字距**：产品名不是新闻报头。全大写必须配字距、混排必须不配——
  `BRAND_TRACK_EM = 0`。真要改成全大写，记得把 TRACK 补上并改 chrome `text_case`。
- **字标垂直居中走墨迹，不走 em 盒**：取 `actualBoundingBox` 的上下沿才是眼睛看到的中心。
- **OG 图**：底色 / 文字色 / 光晕照抄官网深色模式 token 与 `.sec-glow`。整幅左对齐，
  一条分隔线把报头和内容分开。报头里的标走深底色 `#38bdf8`，不是白切出来的方块。
- **OG 的层级是按小尺寸定的**：分享卡在信息流里常被缩到 300px 上下（微信卡片缩略图尤其小），
  那个尺寸上只有报头和主行还立得住。主行（`LEAD`）走显示体，支撑句压到 26px
  走正文体——缩下去它退成质感，不跟主行抢。
- **OG 文案全部取自站点现行字段**，不改写：主行是 `tagline` 的 en 版本（site_name
  没有后半截可拆），支撑句是 `hero.eyebrow`。**这两处在库里 / locales 改了，常量不会自己跟**。
  查现行值：

  ```sql
  select site_name, tagline from "MarketingSite";
  ```

- **长句自己折行**：OG 上没有溢出滚动这回事，`wrapLines` 按实测宽度断，最多取两行。
- **首页配图**：`hero.jpg` 是一张产品实景——笔记本上左边 `MODULE.spec.yaml`、右边带玉玦的站点预览，
  不是光晕隐喻、不是假数据仪表盘。4:3 对齐 `.hero-media img`。不走 `generate.mjs`。

字体取自官网自己发的那套（`apps/client/public/assets/site-fonts`，见 marketing 的
`theme-fonts`），不吃系统字体——换台机器出图一致。
