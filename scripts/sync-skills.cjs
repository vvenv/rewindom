#!/usr/bin/env node
/**
 * 确保 Claude Code 能读到 `.agents/skills/`。
 *
 * 单一真相源是 `.agents/skills/`（Cursor / Codex 原生扫描）。Claude Code 只认
 * `.claude/skills/`，因此这里放一个指向真相源的符号链接。
 * 不要再在 `.cursor/skills/` 放 skill——Cursor 会同时扫描两处，导致重复加载。
 *
 * 若当前环境无法建 symlink（例如未开 Developer Mode 的 Windows），则退回整目录复制。
 *
 *   node scripts/sync-skills.cjs           # 确保链接（或复制兜底）
 *   node scripts/sync-skills.cjs --watch   # 仅 copy 模式下监听；symlink 无需 watch
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, ".agents", "skills");
const DST_DIR = path.join(ROOT, ".claude", "skills");
const RELATIVE_TARGET = path.join("..", ".agents", "skills");

const WATCH = process.argv.includes("--watch");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(from, to) {
  ensureDir(path.dirname(to));
  const stat = fs.lstatSync(from);
  if (stat.isDirectory()) {
    ensureDir(to);
    for (const entry of fs.readdirSync(from)) {
      copyRecursive(path.join(from, entry), path.join(to, entry));
    }
  } else {
    fs.copyFileSync(from, to);
  }
}

function isCorrectSymlink(dir) {
  try {
    const stat = fs.lstatSync(dir);
    if (!stat.isSymbolicLink()) return false;
    const resolved = path.resolve(path.dirname(dir), fs.readlinkSync(dir));
    return path.resolve(resolved) === path.resolve(SRC_DIR);
  } catch {
    return false;
  }
}

function removePath(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyFallback() {
  if (fs.existsSync(DST_DIR)) removePath(DST_DIR);
  copyRecursive(SRC_DIR, DST_DIR);
  const names = fs.readdirSync(SRC_DIR).filter((name) => {
    const from = path.join(SRC_DIR, name);
    return (
      fs.statSync(from).isDirectory() &&
      fs.existsSync(path.join(from, "SKILL.md"))
    );
  });
  for (const name of names) console.log(`  ✅ ${name}`);
  console.log(
    `\n✨ 已复制 ${names.length} 个 skill → .claude/skills/（symlink 不可用，copy 兜底）`,
  );
}

function ensureLink() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`✗ 源目录不存在: ${path.relative(ROOT, SRC_DIR)}`);
    process.exit(1);
  }

  if (isCorrectSymlink(DST_DIR)) {
    console.log("✨ .claude/skills → .agents/skills（符号链接已就绪）");
    return "symlink";
  }

  ensureDir(path.dirname(DST_DIR));
  try {
    fs.lstatSync(DST_DIR);
    removePath(DST_DIR);
  } catch {
    // absent
  }

  try {
    fs.symlinkSync(RELATIVE_TARGET, DST_DIR, "dir");
    if (!isCorrectSymlink(DST_DIR)) {
      throw new Error("symlink created but does not resolve to .agents/skills");
    }
    console.log("✨ 已创建 .claude/skills → .agents/skills");
    return "symlink";
  } catch (err) {
    console.warn(`  ⚠️  无法创建符号链接（${err.message}），改用复制`);
    copyFallback();
    return "copy";
  }
}

const mode = ensureLink();

if (WATCH) {
  if (mode === "symlink") {
    console.log("\n符号链接无需 watch：改 `.agents/skills/` 即对 Claude Code 生效。");
    process.exit(0);
  }
  console.log("\n👀 监听 .agents/skills/ …");
  fs.watch(SRC_DIR, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    console.log(`\n🔄 变更: ${filename}`);
    copyFallback();
  });
}
