/* eslint-disable no-console */
/**
 * 存量文档正文里写死的 locale 前缀 → 逻辑路径。
 *
 * 背景：内置文档以前按目录写死前缀（`en/*.md` 里全是 `/en/docs/…`），只在站点主语言
 * 是 `zh-CN` 时成立。现在正文存逻辑路径、前缀在渲染期补（SSR `md(body, ctx)`、SPA
 * `MarkdownProse`），源文件也改过来了——但**建过库的实例**里那份正文不会被 seed 回灌
 * （`ensureDefaultSiteDocs` 按语言幂等：某语言已有已发布文档就整体跳过，免得覆盖租户
 * 的编辑）。库里的存量数据要一次性接住，这个脚本就是那一次。
 *
 * 改写只动链接上的语言段（`stripDocLinkLocale`），正文其余部分一个字符都不碰——所以
 * 不存在「拿新版出厂正文盖掉租户内容」这回事。按内容分两级：
 *
 * - **出厂原样**（除前缀外与仓库里那份一字不差）：默认就改，这一步没有判断余地；
 * - **对不上**：租户改过，或库里还是更早一版出厂正文（两者从内容上分不开）。默认
 *   只列出来不动，确认过就加 `--include-diverged` 一起改。这批里唯一可能改错的是
 *   「租户**故意**写的跨语言链接」（英文页里指向中文版），先 `--dry-run` 看名单。
 *
 * 已发布（`body_md`）与草稿（`body_md_draft`）各判各的：改了草稿还没发布很常见。
 * 不限默认租户——克隆出来的租户（`clone-tenant.ts`）带着同一份出厂正文，判定看内容
 * 不看租户，克隆体一并接住。
 *
 * 重复执行安全：剥过前缀的正文再剥一次不变。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/backfill-site-doc-locale-hrefs.ts --dry-run
 *   pnpm --filter server exec tsx scripts/backfill-site-doc-locale-hrefs.ts
 *   pnpm --filter server exec tsx scripts/backfill-site-doc-locale-hrefs.ts --include-diverged
 *   pnpm --filter server exec tsx scripts/backfill-site-doc-locale-hrefs.ts --tenant <slug>
 */

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

import { loadUsageDocs } from "../../../modules/site-docs/server/load-usage-docs.js";
import {
  buildSeedBodyIndex,
  hasLocalePrefixedDocLink,
  matchesSeedBody,
  stripDocLinkLocale,
} from "../../../modules/site-docs/server/seed-body-links.js";

const TAG = "[backfill-site-doc-locale-hrefs]";

type BodyField = "body_md" | "body_md_draft";

const FIELDS: readonly BodyField[] = ["body_md", "body_md_draft"];

const FIELD_LABEL: Record<BodyField, string> = {
  body_md: "已发布",
  body_md_draft: "草稿",
};

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const includeDiverged = process.argv.includes("--include-diverged");
  const tenantArg = process.argv.indexOf("--tenant");
  const tenantSlug = tenantArg >= 0 ? process.argv[tenantArg + 1] : undefined;

  const tenantId = tenantSlug
    ? (
        await prisma.tenant.findFirst({
          where: { slug: tenantSlug },
          select: { id: true },
        })
      )?.id
    : undefined;
  if (tenantSlug && !tenantId) {
    console.error(`${TAG} 找不到租户 ${tenantSlug}`);
    process.exitCode = 1;
    return;
  }

  const seedIndex = buildSeedBodyIndex(loadUsageDocs());
  const docs = await prisma.siteDoc.findMany({
    where: tenantId ? { tenant_id: tenantId } : {},
    select: {
      id: true,
      tenant_id: true,
      slug: true,
      locale: true,
      body_md: true,
      body_md_draft: true,
    },
  });

  console.log(
    `${TAG} docs=${docs.length} seed=${seedIndex.size} dry_run=${dryRun} include_diverged=${includeDiverged}`,
  );

  let touched = 0;
  const skipped: string[] = [];
  for (const doc of docs) {
    const where = `${doc.tenant_id} ${doc.locale} /docs/${doc.slug}`;
    const data: Partial<Record<BodyField, string>> = {};
    const notes: string[] = [];
    const held: string[] = [];

    for (const field of FIELDS) {
      const body = doc[field];
      if (typeof body !== "string" || !hasLocalePrefixedDocLink(body)) continue;
      const seeded = matchesSeedBody(seedIndex, body);
      if (!seeded && !includeDiverged) {
        held.push(FIELD_LABEL[field]);
        continue;
      }
      data[field] = stripDocLinkLocale(body);
      notes.push(seeded ? FIELD_LABEL[field] : `${FIELD_LABEL[field]}(对不上)`);
    }

    if (held.length > 0) skipped.push(`  ${where}（${held.join(" / ")}）`);
    if (notes.length === 0) continue;

    touched += 1;
    console.log(`  ${where} ← ${notes.join(" / ")}`);
    if (dryRun) continue;
    await prisma.siteDoc.update({ where: { id: doc.id }, data });
  }

  console.log(`${TAG} ${dryRun ? "会改" : "已改"} ${touched} 篇文档`);

  if (skipped.length > 0) {
    console.log(
      `${TAG} 另有 ${skipped.length} 篇内容与出厂正文对不上（租户改过，或还是更早一版出厂正文），链接仍带 locale 前缀。确认无误后加 --include-diverged 一起改：`,
    );
    for (const line of skipped) console.log(line);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
