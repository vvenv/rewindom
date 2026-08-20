# yestino-brand

yestino.com（events 模块当首页的那个站点）的品牌资产真源。

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
pnpm --filter server exec node scripts/yestino-brand/generate.mjs
```

各变体**不重抄路径**：脚本读 `mark.svg` 再做受控改写（去圆角 / 缩字形），
`mark.svg` 的几何一旦重构会当场抛错，而不是悄悄出一张不对的图。

再写进站点（改 `theme_settings` 两列，不发布页头页脚草稿）：

```bash
pnpm --filter server exec tsx scripts/apply-yestino-brand.ts --dry-run --slug yestino
pnpm --filter server exec tsx scripts/apply-yestino-brand.ts --slug yestino
```

`apply-yestino-brand.ts` 只覆盖 `logo_url` / `favicon_url` / `og_image` 三个字段。
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

**尚未接进代码**：`apple-touch-icon.png` / `maskable-512.png` 目前只是文件。
SSR 那边（`packages/builtin/marketing/server/ssr-render.ts`）只输出一行
`<link rel="icon">`，没有 `apple-touch-icon`、没有 `site.webmanifest`。
要让这两张真正生效，得改 marketing 模块 —— 按仓库约定先填 FEATURE.spec。

## 设计口径

跟着官网当前的样子走，不另立一套：

- **形**：一笔上扬的加速曲线。产品口径（Rising —— 新增来源 / 新增信号在涨）就是这个形，
  单一连通笔画，缩到 16px 仍然是它自己。
- **为什么不是大写 Y**：Hacker News 的标就是方块里一个大写 Y。同一批读者的图标堆里
  正面撞车，而 yestino 要突围的恰恰是这批平台。
- **为什么不补左臂凑成小写 y**：试过。补上确实读成 y，但曲线一旦被第二笔切开，轮廓就从
  「一道甩出去的弧」退回一个字母，识别度反而掉一档。在左上放分离圆点更差：16px 上点和
  曲线糊成一团，大尺寸读成「ソ」。
- **主色**：容器渐变只在官网 accent `#4F46E5` 的同色相里走深浅（`#6366F1 → #4F46E5 → #4338CA`）。
  官网通篇只有一个 accent，标里不该出现第二种色相。
- **容器不跟官网换近黑**：试过用官网深色 token 当底，看着高级，但深色标签栏上整块
  容器直接消失，只剩一个白字形飘着，图标失去轮廓。彩色容器留着。
- **尺寸下限是 24px**：官网页头 `.logo{height:1.5rem}`。所以笔画粗、不放分离的小元素。
- **字体是两款，不是一款**：字标 Newsreader（显示体），正文 Source Sans 3。一款通吃整幅
  时，字标要么压不住（Source Sans 3 是正文字面，上到 900 墨量仍不如 Inter 的 400），
  要么把个性洒到每一行（Fraunces 连胶囊和域名都跟着变形）。字标走编辑体 serif，
  是因为 yestino 是资讯产品，这也把它和满屏无衬线的 SaaS 分开。
- **字标全大写 + 宽字距**：走新闻报头那套（WIRED / REUTERS 一路），也是它和满屏混排
  无衬线 SaaS 拉开距离的地方。三种都出图比过：混排 `Yestino` 稳但偏常规；全小写
  `yestino` 的下伸笔画确实和标的弧线呼应，但字标塌成一条没起伏的横带，masthead 的
  分量掉了；全大写在 700 字重上笔画粗细正好和标的弧线对上。
- **字距存 em 比例，不存像素**：OG 上字标 52px、横向字标 92px，存像素两处会各自漂。
  常量是 `BRAND_TRACK_EM`。**全大写必须配字距、混排必须不配**——真要改回
  `BRAND = "Yestino"`，记得把 `BRAND_TRACK_EM` 归零。
- **字标垂直居中走墨迹，不走 em 盒**：全大写没有下伸笔画，`textBaseline="middle"` 会让
  整段字标比旁边的标高出一截。取 `actualBoundingBox` 的上下沿才是眼睛看到的中心。
- **页头字标要跟上**：官网页头渲染的是 `brand_text` / `site_name`（现在是 `Yestino - …`），
  OG 走全大写而那边不动，两处就不一致了。全大写是排版处理不是改名，页头那边套
  `text-transform: uppercase` 即可，但那是 marketing 模块的事，本次没动。
- **OG 图**：底色 / 文字色 / 光晕照抄官网深色模式 token 与 `.sec-glow`。整幅左对齐，
  一条分隔线把报头和内容分开。
- **OG 的层级是按小尺寸定的**：分享卡在信息流里常被缩到 300px 上下（微信卡片缩略图尤其小），
  那个尺寸上只有报头和主行还立得住。所以主行（`LEAD`）拉到 56px 走显示体，支撑句压到 26px
  走正文体——缩下去它退成质感，不跟主行抢。**曾经在这里放 Rising / Now / Timeline 三个胶囊，
  已经删掉**：那是段名不是文案，且小尺寸下纯粹是噪点。
- **OG 文案全部取自站点现行字段**，不改写：主行是 `site_name` 的后半截（`Yestino - The Signal`），
  支撑句是 `tagline` 的 en 版本。**这两处在库里改了，常量不会自己跟**——上一版就是这么漂掉的
  （卡上那句话早已不在站点上）。查现行值：

  ```sql
  select site_name, tagline from "MarketingSite";
  ```

- **长句自己折行**：OG 上没有溢出滚动这回事，`wrapLines` 按实测宽度断，最多取两行。

两款字体都取自官网自己发的那套（`apps/client/public/assets/site-fonts`，见 marketing 的
`theme-fonts`），不吃系统字体——换台机器出图一致。
