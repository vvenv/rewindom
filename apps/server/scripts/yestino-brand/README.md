# yestino-brand

yestino.com（events 模块当首页的那个站点）的品牌资产真源。

## 文件

| 文件 | 是什么 | 谁生成 |
| --- | --- | --- |
| `mark.svg` | 品牌标 / logo / favicon，256×256 圆角块 | 手改 |
| `mark-mono.svg` | 单色版（容器走 `currentColor`），印刷 / 单色场景 | 手改，几何跟随 `mark.svg` |
| `og.png` | og:image，1200×630 | `generate.mjs` |
| `favicon-512.png` | favicon 的 PNG 兜底 / 应用图标 / 社媒头像 | `generate.mjs` |

**只手改 SVG**，位图一律重跑生成脚本：

```bash
pnpm --filter server exec node scripts/yestino-brand/generate.mjs
```

再写进站点（改 `theme_settings` 两列，不发布页头页脚草稿）：

```bash
pnpm --filter server exec tsx scripts/apply-yestino-brand.ts --dry-run --slug yestino
pnpm --filter server exec tsx scripts/apply-yestino-brand.ts --slug yestino
```

## 设计口径

跟着官网当前的样子走，不另立一套：

- **主色**：容器渐变只在官网 accent `#4F46E5` 的同色相里走深浅（`#6366F1 → #4F46E5 → #4338CA`）。
  官网通篇只有一个 accent，标里不该出现第二种色相。
- **形**：两条来源线汇成一条时间线 —— events 的产品口径（跨来源发现 → 合并 → 重建时间线），
  同时读作字母 Y。
- **尺寸下限是 24px**：官网页头 `.logo{height:1.5rem}`。所以笔画粗（44/256）、
  不放分离的小元素（试过「时间线末端的 now 圆点」和「虚线来源臂」，24px 以下都糊成一团）。
- **OG 图**：底色 / 文字色 / 边框色 / 顶部光晕全部照抄官网深色模式 token 与 `.sec-glow`；
  胶囊沿用事件卡片上的状态胶囊样式（只描边不填色）；文案取官网 `/en` 的现行 description
  与两个首页段名（Rising / Now）。**改官网文案时记得回来改 `generate.mjs` 顶部的常量。**

字体用官网自己发的 Inter（`apps/client/public/assets/site-fonts`），不吃系统字体——换台机器出图一致。
