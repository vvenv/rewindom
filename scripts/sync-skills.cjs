#!/usr/bin/env node
/**
 * 把 `.cursor/skills/` 同步到 `.claude/skills/`。
 *
 * 两个客户端的 skill 格式一致（`SKILL.md` + frontmatter 的 `name` / `description`，
 * 可选 `reference/`），因此是**直接复制**，不做格式转换。
 *
 * 单一真相源是 `.cursor/skills/`；`.claude/skills/` 为生成物，勿手改。
 * Rules 不同步——Cursor 用 `.cursor/rules/*.mdc`，Claude 用根目录 `AGENTS.md`，
 * 两者形态不同，各自维护。
 *
 *   node scripts/sync-skills.cjs           # 同步一次
 *   node scripts/sync-skills.cjs --watch   # 监听变更
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, ".cursor", "skills");
const DST_DIR = path.join(ROOT, ".claude", "skills");

const WATCH = process.argv.includes("--watch");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(from, to) {
  ensureDir(path.dirname(to));
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    ensureDir(to);
    for (const entry of fs.readdirSync(from)) {
      copyRecursive(path.join(from, entry), path.join(to, entry));
    }
  } else {
    fs.copyFileSync(from, to);
  }
}

function syncSkills() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`✗ 源目录不存在: ${path.relative(ROOT, SRC_DIR)}`);
    process.exit(1);
  }

  // 先清掉生成物中已不存在的 skill，避免删除后残留
  if (fs.existsSync(DST_DIR)) {
    const src = new Set(fs.readdirSync(SRC_DIR));
    for (const name of fs.readdirSync(DST_DIR)) {
      if (!src.has(name)) {
        fs.rmSync(path.join(DST_DIR, name), { recursive: true, force: true });
        console.log(`  🗑  移除已删除的 skill: ${name}`);
      }
    }
  }

  ensureDir(DST_DIR);
  let count = 0;
  for (const name of fs.readdirSync(SRC_DIR)) {
    const from = path.join(SRC_DIR, name);
    if (!fs.statSync(from).isDirectory()) continue;
    if (!fs.existsSync(path.join(from, "SKILL.md"))) {
      console.warn(`  ⚠️  跳过（无 SKILL.md）: ${name}`);
      continue;
    }
    copyRecursive(from, path.join(DST_DIR, name));
    console.log(`  ✅ ${name}`);
    count += 1;
  }
  console.log(`\n✨ 已同步 ${count} 个 skill → .claude/skills/`);
}

syncSkills();

if (WATCH) {
  console.log("\n👀 监听 .cursor/skills/ …");
  fs.watch(SRC_DIR, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    console.log(`\n🔄 变更: ${filename}`);
    syncSkills();
  });
}
