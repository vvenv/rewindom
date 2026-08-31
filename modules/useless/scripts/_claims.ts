/**
 * 打印每条东西的「说法」——也就是条目开头那段注释。
 *
 * 用来做取舍：**机制重复比标题重复更常见，而标题重复有测试挡、机制重复没有。**
 * 收新东西之前先把邻近几条的说法并排读一遍，比读代码快得多。
 *
 *   pnpm --filter @rewindom/useless exec tsx scripts/_claims.ts [标题...]
 *
 * 不给标题就全打。
 */
import { readFileSync } from "node:fs";

const want = process.argv.slice(2);
const files = ["tap", "auto"] as const;

for (const f of files) {
  const src = readFileSync(
    new URL(`../server/seed-embeds/${f}.ts`, import.meta.url),
    "utf8",
  );
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*title: "(.+)",$/.exec(lines[i]);
    if (!m) continue;
    if (want.length && !want.includes(m[1])) continue;
    const out: string[] = [];
    // 说法是紧跟在 play(...) 头几行之后、第一段连续的 `//` 注释
    for (let j = i; j < i + 90 && j < lines.length; j++) {
      const t = lines[j].trim();
      if (t.startsWith("//")) out.push("   " + t.slice(2).trim());
      else if (out.length && t.startsWith('"')) break;
    }
    console.log(`── ${m[1]}  (${f}) ${"─".repeat(Math.max(0, 46 - m[1].length))}`);
    console.log(out.length ? out.join("\n") : "   （没有说法——这条多半还没过第二关）");
  }
}
