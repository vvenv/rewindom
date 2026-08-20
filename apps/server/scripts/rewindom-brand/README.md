# rewindom-brand

rewindom.com（产品主域、默认租户）的品牌资产真源。

## 文件

| 文件 | 是什么 | 谁生成 |
| --- | --- | --- |
| `mark.svg` | 品牌标 / logo / favicon，256×256 圆角块 | 手改 |
| `mark-mono.svg` | 单色版（容器走 `currentColor`），印刷 / 单色场景 | 手改，几何跟随 `mark.svg` |
| `og.png` | og:image / twitter:image，1200×630 | `generate.mjs` |
| `favicon-512.png` | favicon 的 PNG 兜底（**自带**圆角） | `generate.mjs` |
| `avatar-1024.png` | X / 微信公众号头像（满幅出血、**不带**圆角） | `generate.mjs` |
| `apple-touch-icon.png` | 180×180，iOS 加到主屏 | `generate.mjs` |
| `maskable-512.png` | Android 自适应图标（字形收进安全区） | `generate.mjs` |
| `wordmark-light.png` | 横向字标，白字，给深底 | `generate.mjs` |
| `wordmark-dark.png` | 横向字标，黑字，给浅底 | `generate.mjs` |

**只手改 SVG**，位图一律重跑生成脚本：

```bash
pnpm --filter server exec node scripts/rewindom-brand/generate.mjs
```

各变体**不重抄路径**：脚本读 `mark.svg` 再做受控改写（去圆角 / 缩字形），
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
- `brand_font_family`（Inter）
- `primary_color`（`#0369a1`，可用 `--no-primary` 跳过）

其余几张的落地方式见下面「谁用哪张」。

## 谁用哪张

分三类，容器处理不一样，别互相顶替：

| 场景 | 用哪张 | 为什么不能用别的 |
| --- | --- | --- |
| 官网页头 logo | `mark.svg` | 矢量场景 |
| 浏览器标签页 | `mark.svg`（或 `favicon-512.png` 兜底） | 没有平台遮罩，圆角得自己带 |
| X / 微信公众号头像 | `avatar-1024.png` | 平台自己套圆形遮罩；用自带圆角的那张会被二次裁切成一圈毛边 |
| iOS 加到主屏 | `apple-touch-icon.png` | 同上，iOS 套的是圆角矩形 |
| Android 自适应图标 | `maskable-512.png` | 安全区是「中心 80% 直径的圆」，字形要再缩一档才不会被遮罩切到 |
| 公众号头图 / 演示稿 / 页脚 | `wordmark-*.png` | 透明底解决不了字色，深浅底各一张 |

工作台侧栏 / 登录页**不**用这套容器标：那边走 `packages/client-kit` 的 `Logo`
（同一条玉玦 path、`currentColor`、不带圆角块）。

**尚未接进代码**：无。`apple-touch-icon.png` / `maskable-512.png` 由
`apply-rewindom-brand.ts` 写入 `theme_settings`，SSR 在字段有值时分别输出
`<link rel="apple-touch-icon">` 与 `<link rel="manifest" href="/site.webmanifest">`。

## 设计口径

跟着官网当前的样子走，不另立一套：

- **形**：厚壁圆环顶开一条径向缝（玉玦）。产品口径（底座是闭合的环，缝是模块
  挂点——底座随业务成形）就是这个形，单一连通实心，缩到 16px 仍然是它自己。
- **为什么不是大写 R**：开发者工具图标堆里字母标没有轮廓，而玉玦已经是产品
  自己的形（工作台 Logo / `favicon.svg` / `docs/assets/logo.svg` 同一条 path）。
- **主色**：容器渐变只在官网 accent `#0369a1` 的同色相里走深浅
  （`#0ea5e9 → #0284c7 → #0369a1`）。官网通篇只有一个 accent，标里不该出现第二种色相。
- **容器不跟官网换近黑**：试过用官网深色 token 当底，看着高级，但深色标签栏上整块
  容器直接消失，只剩一个白字形飘着，图标失去轮廓。彩色容器留着。
- **尺寸下限是 24px**：官网页头 `.logo{height:1.5rem}`。所以环壁厚、缝够宽、
  不放分离的小元素。字形按画布中心缩到 0.78，给圆角和 maskable 安全区留边。
- **字体是一款，不是两款**：产品站 `font_family = inter`。字标和正文都走 Inter，
  用字重拉开层级（700 / 400）。不另配显示体——Newsreader 是资讯产品的编辑体，
  用在这里会把 Rewindom 收成又一个「衬线 SaaS」。
- **字标混排、不配字距**：产品名不是新闻报头。全大写必须配字距、混排必须不配——
  `BRAND_TRACK_EM = 0`。真要改成全大写，记得把 TRACK 补上并改 chrome `text_case`。
- **字标垂直居中走墨迹，不走 em 盒**：取 `actualBoundingBox` 的上下沿才是眼睛看到的中心。
- **OG 图**：底色 / 文字色 / 光晕照抄官网深色模式 token 与 `.sec-glow`。整幅左对齐，
  一条分隔线把报头和内容分开。
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

字体取自官网自己发的那套（`apps/client/public/assets/site-fonts`，见 marketing 的
`theme-fonts`），不吃系统字体——换台机器出图一致。
