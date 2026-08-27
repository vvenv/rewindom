#!/usr/bin/env node
/**
 * 模块脚手架：MODULE.spec.yaml → 可运行的租户 CRUD 模块
 *
 * `notes` 那 29 个文件里约 20 个是纯机械的装配（manifest、路由壳、hooks 四件套、
 * 表格/抽屉骨架、两处注册表、Prisma 符号链接、审计动作三处登记）。这些交给
 * LLM 每次重写就每次不一样——本脚本把它们变成 spec 的确定性函数，
 * 让人/agent 只需要填 service 里的业务逻辑。
 *
 *   node scripts/gen-module.mjs <spec.yaml>          # 生成
 *   node scripts/gen-module.mjs <spec.yaml> --force  # 覆盖已存在的模块目录
 *   node scripts/gen-module.mjs <spec.yaml> --dry-run
 *
 * spec 模板：.agents/skills/create-module/templates/MODULE.spec.yaml
 *
 * 支持范围（故意收窄——宁可明确报错，也不生成半对的代码）：
 *   - surfaces: [tenant]，挂载点 renderRoutes 的列表型 CRUD
 *   - 表单字段限 String（含 multiline）
 * 超出范围时报错并指向 create-module skill 手工建。
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY = args.includes("--dry-run");
const specPath = args.find((a) => !a.startsWith("--"));

if (!specPath) {
  console.error(
    "用法：node scripts/gen-module.mjs <spec.yaml> [--force] [--dry-run]\n" +
      "模板：.agents/skills/create-module/templates/MODULE.spec.yaml",
  );
  process.exit(1);
}

// ---------------------------------------------------------------- YAML 子集解析
//
// 仓库里的脚本一律零依赖，spec 的语法面又固定，所以自带一个子集解析器：
// 支持缩进映射/序列、行内 [a, b] 与 { k: v }（可跨行）、注释、引号、布尔与整数。
// 不支持锚点、多行折叠、复杂键——遇到就当普通字符串，spec 校验会兜住。

function stripComment(line) {
  let inQuote = null;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQuote) {
      if (c === inQuote) inQuote = null;
    } else if (c === '"' || c === "'") inQuote = c;
    else if (c === "#" && (i === 0 || /\s/u.test(line[i - 1])))
      return line.slice(0, i);
  }
  return line;
}

/**
 * 一行里未闭合的 `[` / `{` 数量，引号内的括号不算。
 *
 * 行内集合是允许跨行写的，模板与既有 spec 的 `permissions` 就是那么排版的。
 * 没有这个判断，`- {` 会被当成一个字符串项收下，后面几行更深缩进的键谁也认领不了，
 * 于是 `parseMap` 在同一缩进层上再也匹配不到——**该层剩下的键被整段丢掉**。
 * 症状是模板自己都解析不出 models / api / client，报「缺少必填项」。
 */
function flowDepth(line) {
  let depth = 0;
  let quote = null;
  for (const c of line) {
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "[" || c === "{") depth += 1;
    else if (c === "]" || c === "}") depth -= 1;
  }
  return depth;
}

function splitTopLevel(text, sep = ",") {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = "";
  for (const c of text) {
    if (quote) {
      if (c === quote) quote = null;
      current += c;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    if ("[{".includes(c)) depth += 1;
    if ("]}".includes(c)) depth -= 1;
    if (c === sep && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  if (current.trim()) parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

function parseScalar(raw) {
  const v = raw.trim();
  if (v === "") return "";
  if (v.startsWith("[") && v.endsWith("]")) {
    return splitTopLevel(v.slice(1, -1)).map(parseScalar);
  }
  if (v.startsWith("{") && v.endsWith("}")) {
    const obj = {};
    for (const pair of splitTopLevel(v.slice(1, -1))) {
      const idx = pair.indexOf(":");
      if (idx === -1) continue;
      obj[pair.slice(0, idx).trim()] = parseScalar(pair.slice(idx + 1));
    }
    return obj;
  }
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "~") return null;
  if (/^-?\d+$/u.test(v)) return Number(v);
  return v;
}

function parseYaml(text) {
  const lines = [];
  // 括号没闭合就把后续行接上来，凑成一条完整的逻辑行；缩进以第一行为准
  let pending = null;
  let pendingDepth = 0;
  const flush = () => {
    if (pending === null) return;
    lines.push({
      indent: pending.match(/^\s*/u)[0].length,
      text: pending.trim(),
    });
    pending = null;
    pendingDepth = 0;
  };
  for (const raw of text.split(/\r?\n/u)) {
    const line = stripComment(raw);
    if (!line.trim()) continue;
    if (pending === null) {
      pending = line;
      pendingDepth = flowDepth(line);
    } else {
      pending += ` ${line.trim()}`;
      pendingDepth += flowDepth(line);
    }
    // 深度归零（或因为写坏了转负）就收线，别把整份文件粘成一行
    if (pendingDepth <= 0) flush();
  }
  flush();

  let cursor = 0;
  function parseBlock(indent) {
    if (cursor >= lines.length) return null;
    return lines[cursor].text.startsWith("- ")
      ? parseSeq(indent)
      : parseMap(indent);
  }

  function parseSeq(indent) {
    const out = [];
    while (cursor < lines.length && lines[cursor].indent === indent) {
      const { text } = lines[cursor];
      if (!text.startsWith("- ")) break;
      const rest = text.slice(2).trim();
      cursor += 1;
      if (/^[\w-]+:/u.test(rest) && !rest.startsWith("{")) {
        // `- name: X` 起头的对象项：本行的键 + 后续更深缩进的键合并
        const idx = rest.indexOf(":");
        const item = {
          [rest.slice(0, idx).trim()]: parseInlineOrBlock(
            rest.slice(idx + 1),
            indent + 2,
          ),
        };
        while (cursor < lines.length && lines[cursor].indent > indent) {
          Object.assign(item, parseMap(lines[cursor].indent));
        }
        out.push(item);
      } else {
        out.push(parseScalar(rest));
      }
    }
    return out;
  }

  function parseInlineOrBlock(valueText, childIndent) {
    if (valueText.trim()) return parseScalar(valueText);
    if (cursor < lines.length && lines[cursor].indent >= childIndent) {
      return parseBlock(lines[cursor].indent);
    }
    return null;
  }

  function parseMap(indent) {
    const out = {};
    while (cursor < lines.length && lines[cursor].indent === indent) {
      const { text } = lines[cursor];
      if (text.startsWith("- ")) break;
      const idx = text.indexOf(":");
      if (idx === -1) {
        cursor += 1;
        continue;
      }
      const key = text.slice(0, idx).trim();
      const value = text.slice(idx + 1);
      cursor += 1;
      out[key] = parseInlineOrBlock(value, indent + 1);
    }
    return out;
  }

  return parseBlock(lines[0]?.indent ?? 0) ?? {};
}

// ---------------------------------------------------------------- spec 校验

/** 必填项——与 create-module skill 「第 0 步」的必问表一一对应 */
const REQUIRED = [
  "id",
  "label",
  "kind",
  "placement",
  "resource.singular",
  "resource.plural",
  "surfaces",
  "entitlement.key",
  "entitlement.label",
  "permissions",
  "models",
  "api.prefix",
  "api.operations",
  "client.mount",
  "client.route_path",
  "client.nav.section",
  "client.nav.label",
  "client.nav.title",
  "client.nav.icon",
  "client.page.form_fields",
];

const get = (obj, dotted) =>
  dotted.split(".").reduce((acc, k) => acc?.[k], obj);

function validateSpec(spec) {
  const missing = REQUIRED.filter((key) => {
    const v = get(spec, key);
    return (
      v === undefined ||
      v === null ||
      v === "" ||
      (Array.isArray(v) && v.length === 0)
    );
  });
  if (missing.length > 0) {
    fail(
      `spec 缺少必填项：\n  ${missing.join("\n  ")}\n\n` +
        "这些是 create-module skill 第 0 步的「必问项」——缺了就得追问，不能猜。",
    );
  }

  /*
   * placement 决定产出到哪、产出什么形状——不是注释。
   * 「一包一 manifest：模块 id 与物理包一一对应」（AGENTS.md §模块包布局），
   * 所以目录名必须等于 id，否则 gen:external-modules 按 package.json 认出来的
   * moduleId 会和 spec 对不上。
   */
  const placement = String(spec.placement).replace(/\/+$/u, "");
  const allowedPlacements = [
    `modules/${spec.id}`,
    `packages/builtin/${spec.id}`,
  ];
  if (!allowedPlacements.includes(placement)) {
    fail(
      `placement 必须是 ${allowedPlacements.join(" 或 ")}（当前：${spec.placement}）\n\n` +
        "业务模块放 modules/<id>/（独立 workspace 包，只依赖 @rewindom/module-sdk）；\n" +
        "横切 infra 放 packages/builtin/<id>/（共享 @rewindom/builtin 这一个包）。\n" +
        "目录名与 id 必须一致。",
    );
  }

  const unsupported = [];
  const surfaces = [].concat(spec.surfaces);
  if (surfaces.some((s) => s !== "tenant"))
    unsupported.push(`surfaces: ${surfaces.join(", ")}（仅支持 tenant）`);
  if (spec.client.mount !== "renderRoutes")
    unsupported.push(
      `client.mount: ${spec.client.mount}（仅支持 renderRoutes）`,
    );
  if (spec.models.length !== 1)
    unsupported.push(`models 有 ${spec.models.length} 个（仅支持 1 个主模型）`);

  const fieldsByName = new Map(spec.models[0].fields.map((f) => [f.name, f]));
  for (const name of spec.client.page.form_fields) {
    const field = fieldsByName.get(name);
    if (!field)
      unsupported.push(`form_fields 里的 "${name}" 不在 models[0].fields 中`);
    else if (!FORM_FIELD_TYPES.includes(field.type))
      unsupported.push(
        `表单字段 "${name}" 是 ${field.type}（仅支持 ${FORM_FIELD_TYPES.join(" / ")}）`,
      );
  }

  // q 搜索走 Prisma 的 contains，只有字符串列吃得下
  for (const name of spec.api?.list?.search_fields ?? []) {
    const field = fieldsByName.get(name);
    if (!field)
      unsupported.push(`search_fields 里的 "${name}" 不在 models[0].fields 中`);
    else if (field.type !== "String")
      unsupported.push(
        `search_fields 里的 "${name}" 是 ${field.type}（模糊搜索仅支持 String）`,
      );
  }

  if (unsupported.length > 0) {
    fail(
      `脚手架不支持以下情形：\n  ${unsupported.join("\n  ")}\n\n` +
        "这些情况请按 create-module skill 手工创建——生成半对的代码比不生成更糟。",
    );
  }
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- 命名派生

const pascal = (s) =>
  s.replace(/(^|[-_])(\w)/gu, (_, __, c) => c.toUpperCase());

function deriveNames(spec) {
  const singular = spec.resource.singular;
  const plural = spec.resource.plural;
  const placement = String(spec.placement).replace(/\/+$/u, "");
  const external = placement.startsWith("modules/");
  return {
    id: spec.id,
    placement,
    /** 外部模块是独立 workspace 包，内置模块共享 @rewindom/builtin */
    external,
    /** 审计动作的引用方式：内置用常量，外部用字面量（见 routes 模板注释） */
    auditRef: external ? '"' : "AuditAction.",
    auditRefEnd: external ? '"' : "",
    pkg: external ? `@rewindom/${spec.id}` : "@rewindom/builtin",
    singular,
    plural,
    Singular: pascal(singular),
    Plural: pascal(plural),
    CONST: singular.toUpperCase().replace(/-/gu, "_"),
    model: spec.models[0].name,
    prismaClient:
      spec.models[0].name[0].toLowerCase() + spec.models[0].name.slice(1),
    entitlementKey: spec.entitlement.key,
    readPerm:
      spec.permissions.find((p) => p.key.endsWith(".read"))?.key ??
      spec.permissions[0].key,
    writePerm:
      spec.permissions.find((p) => p.key.endsWith(".write"))?.key ??
      spec.permissions[0].key,
  };
}

const TS_TYPE = {
  String: "string",
  Int: "number",
  Boolean: "boolean",
  DateTime: "string",
};
/** 服务端写入、不由客户端提交的字段 */
const SERVER_MANAGED = new Set(["created_by", "updated_by"]);
/** 表单能渲染的字段类型 */
const FORM_FIELD_TYPES = ["String", "Boolean", "DateTime"];

const isMultiline = (field) =>
  field.type === "String" &&
  (field.multiline === true ||
    ["content", "description", "body", "remark"].includes(field.name));

const isText = (f) => f.type === "String";
const isBool = (f) => f.type === "Boolean";
const isDate = (f) => f.type === "DateTime";
const label = (f) => f.label ?? f.name;

/**
 * 表单里的值类型：DateTime 在表单/线上都走 ISO 字符串（空串 = 未设置），
 * 只在 service 边界转 Date——让 Sheet、payload、API body 三处保持同一种表示。
 */
const formValueType = (f) => (isBool(f) ? "boolean" : "string");
const formInitial = (f) => (isBool(f) ? "false" : '""');

/**
 * DTO → Prisma 写入：字符串 trim，ISO 串转 Date（空串 = 清空），布尔直传。
 * create 时可选字段缺省交给 Prisma 的 @default，故只在给了值时才写。
 */
const createDataLine = (f) => {
  const p = `params.${f.name}`;
  if (isBool(f))
    return `      ...(${p} !== undefined ? { ${f.name}: ${p} } : {}),`;
  if (isDate(f))
    return f.required === false
      ? `      ${f.name}: ${p} ? new Date(${p}) : null,`
      : `      ${f.name}: new Date(${p}),`;
  return `      ${f.name}: ${p}${f.required === false ? '?.trim() ?? ""' : ".trim()"},`;
};

const updateDataLine = (f) => {
  const p = `params.${f.name}`;
  const value = isBool(f)
    ? p
    : isDate(f)
      ? f.required === false
        ? `${p} ? new Date(${p}) : null`
        : `new Date(${p})`
      : `${p}.trim()`;
  return `      ...(${p} !== undefined ? { ${f.name}: ${value} } : {}),`;
};

/** Prisma 记录 → API DTO：只有 DateTime 需要转 ISO，可空列要先判空 */
const mapperLine = (f) =>
  isDate(f)
    ? f.required === false
      ? `    ${f.name}: record.${f.name} ? record.${f.name}.toISOString() : null,`
      : `    ${f.name}: record.${f.name}.toISOString(),`
    : `    ${f.name}: record.${f.name},`;

// ------------------------------------------------- 外部模块：内核 import → SDK 门面
//
// 模板是按内置模块写的，直接 import 内核深路径（server-kernel / client-kit / shared）。
// 外部模块不许这么干——`scripts/verify-module.mjs` 的边界校验会拦下来，理由是外部包
// 只能依赖 `@rewindom/module-sdk` 这一个门面。所以生成完统一改写一次。
//
// 改写会让好几条深路径塌到同一个 specifier 上（service 里 4 条内核 import 全变成
// `@rewindom/module-sdk/server`），必须顺手合并，否则一个文件里四条同源 import，
// `import/no-duplicates` 第一次 lint 就是一屏红。合并结果与金标准 `modules/todo`
// 一致：一条 import，类型成员用行内 `type` 前缀。

function externalSpecifier(specifier, area) {
  if (specifier.startsWith("@rewindom/server-kernel")) {
    return "@rewindom/module-sdk/server";
  }
  if (specifier.startsWith("@rewindom/client-kit")) {
    return "@rewindom/module-sdk/client";
  }
  if (
    specifier === "@rewindom/shared" ||
    specifier.startsWith("@rewindom/shared/")
  ) {
    // client 侧走 /client 子入口，好和同文件里已有的 client 门面 import 合成一条
    return area === "client"
      ? "@rewindom/module-sdk/client"
      : "@rewindom/module-sdk";
  }
  return specifier;
}

/** `import { a, type B } from "x";`（含跨行大括号）；默认导入与副作用 import 不碰 */
const NAMED_IMPORT_RE =
  /^import\s+(type\s+)?\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];?[ \t]*$/gmu;

function rewriteSdkImports(text, area) {
  const groups = new Map();
  for (const match of text.matchAll(NAMED_IMPORT_RE)) {
    const [, typeOnly, body, specifier] = match;
    const target = externalSpecifier(specifier, area);
    if (!target.startsWith("@rewindom/module-sdk")) continue;
    let group = groups.get(target);
    if (!group) {
      group = { members: [], matches: [] };
      groups.set(target, group);
    }
    for (const raw of body.split(",")) {
      const member = raw.trim();
      if (!member) continue;
      const marked =
        typeOnly && !member.startsWith("type ") ? `type ${member}` : member;
      if (!group.members.includes(marked)) group.members.push(marked);
    }
    group.matches.push(match);
  }
  if (groups.size === 0) return text;

  const edits = [];
  for (const [target, group] of groups) {
    const allType = group.members.every((m) => m.startsWith("type "));
    const names = allType
      ? group.members.map((m) => m.slice("type ".length))
      : group.members;
    const [first, ...rest] = group.matches;
    edits.push({
      start: first.index,
      end: first.index + first[0].length,
      // prettier 随后会按行宽决定要不要拆行，这里不操心排版
      text: `import ${allType ? "type " : ""}{ ${names.join(", ")} } from "${target}";`,
    });
    for (const match of rest) {
      edits.push({
        start: match.index,
        end: match.index + match[0].length,
        text: null,
      });
    }
  }

  // 从后往前改，前面的替换才不会挪动后面的下标
  edits.sort((a, b) => b.start - a.start);
  let out = text;
  for (const edit of edits) {
    if (edit.text === null) {
      // 连同行尾换行一起删，别留下空行让 import 分组看起来断开
      const end = out[edit.end] === "\n" ? edit.end + 1 : edit.end;
      out = out.slice(0, edit.start) + out.slice(end);
    } else {
      out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
    }
  }
  return out;
}

// ---------------------------------------------------------------- 文件模板

function buildFiles(spec, n) {
  const model = spec.models[0];
  const fields = model.fields;
  const formFields = spec.client.page.form_fields.map((name) =>
    fields.find((f) => f.name === name),
  );
  const bodyFields = fields.filter((f) => !SERVER_MANAGED.has(f.name));
  const searchFields = spec.api?.list?.search_fields ?? [];
  const sortWhitelist = spec.api?.list?.sort_whitelist ?? [
    "created_at",
    "updated_at",
  ];
  const defaultSort = spec.api?.list?.default_sort ?? {
    by: "updated_at",
    dir: "desc",
  };
  const operations = spec.api.operations;
  const auditActions =
    spec.audit?.actions ??
    [
      { action: `${n.CONST}_CREATE`, label: `创建${spec.entitlement.label}` },
      { action: `${n.CONST}_UPDATE`, label: `更新${spec.entitlement.label}` },
      { action: `${n.CONST}_DELETE`, label: `删除${spec.entitlement.label}` },
    ].filter((a) =>
      operations.includes(a.action.split("_").pop().toLowerCase()),
    );

  const tsField = (f) =>
    `  ${f.name}: ${TS_TYPE[f.type]}${f.required === false ? " | null" : ""};`;
  const maxLenConst = (f) => `${n.CONST}_${f.name.toUpperCase()}_MAX_LENGTH`;

  const files = {};
  const add = (rel, content) => {
    files[rel] = `${content.trim()}\n`;
  };

  // ---- shared
  add(
    `shared/${n.singular}.ts`,
    `
export interface ${n.Singular} {
  id: string;
  tenant_id: string;
${fields.map(tsField).join("\n")}
  created_at: string;
  updated_at: string;
}

export interface ${n.Singular}ListItem {
  id: string;
${fields.map(tsField).join("\n")}
  created_at: string;
  updated_at: string;
}

export interface Create${n.Singular}Body {
${bodyFields.map((f) => `  ${f.name}${f.required === false || f.default !== undefined ? "?" : ""}: ${TS_TYPE[f.type]};`).join("\n")}
}

export interface Update${n.Singular}Body {
${bodyFields.map((f) => `  ${f.name}?: ${TS_TYPE[f.type]};`).join("\n")}
}
`,
  );

  add(
    "shared/entitlements.ts",
    `
import type { TenantModuleEntitlement } from "@rewindom/shared";

export const ${n.CONST}_ENTITLEMENT: TenantModuleEntitlement = {
  key: "${spec.entitlement.key}",
  label: "${spec.entitlement.label}",
  description: "${spec.entitlement.description ?? spec.entitlement.label}",
  disabled_hint: "${spec.entitlement.disabled_hint ?? `该租户未开通${spec.entitlement.label}模块`}",
  default_enabled: ${spec.entitlement.default_enabled ?? false},
};
`,
  );

  add(
    "shared/index.ts",
    `export * from "./${n.singular}.js";\nexport * from "./entitlements.js";`,
  );

  // ---- prisma
  const prismaField = (f) => {
    const optional = f.required === false ? "?" : "";
    // 只有 String 的默认值要带引号；Boolean/Int 裸写，DateTime 用 now()
    const raw = isText(f) ? `"${f.default}"` : `${f.default}`;
    const def = f.default !== undefined ? ` @default(${raw})` : "";
    return `  ${f.name} ${f.type}${optional}${def}`;
  };
  /*
   * 外部 `prisma/schema.prisma`、内置 `models.prisma`——这是 create-module skill
   * 定死的约定，note / todo / shop 三个现存外部模块都是前者。
   * 「片段不要叫 schema.prisma」那条警告只针对**内置**片段（它们平铺在包根上，
   * Prisma 语言服务会把 schema.prisma 当成独立 schema 根）。
   */
  const prismaRel = n.external ? "prisma/schema.prisma" : "models.prisma";
  add(
    prismaRel,
    `
// ${n.placement}/${prismaRel}
// 由 apps/server/prisma/models/${n.id}.prisma 符号链接汇入${n.external ? "（gen:external-modules 自动建链）" : ""}
// --- module: ${n.id} ---
model ${model.name} {
  id         String   @id @default(uuid())
  tenant_id  String
${fields.map(prismaField).join("\n")}
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

${(model.indexes ?? [["tenant_id"]]).map((idx) => `  @@index([${[].concat(idx).join(", ")}])`).join("\n")}
}
`,
  );

  // ---- server manifest
  add(
    "server/module.ts",
    `
import { registerTenantGatedRoutes } from "@rewindom/server-kernel/runtime/register-tenant-gated-routes.js";

import { ${n.CONST}_ENTITLEMENT } from "../shared/entitlements.js";

import { ${n.singular}Routes } from "./${n.singular}.routes.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const ${camel(n.id)}ServerModule: ServerAppModule = {
  id: "${n.id}",
  version: "1.0.0",
  label: "${spec.label}",
  kind: "${spec.kind}",
  description: "${spec.description ?? spec.label}",
  requires: [${(spec.requires ?? []).map((r) => `"${r}"`).join(", ")}],
  tenantEntitlements: [${n.CONST}_ENTITLEMENT],
  shared: {
    permissions: [
${spec.permissions
  .map(
    (p) =>
      `      {\n        key: "${p.key}",\n        label: "${p.label}",\n        group: "${p.group ?? spec.label}",\n        description: "${p.description ?? p.label}",\n      },`,
  )
  .join("\n")}
    ],
    auditActions: [
${auditActions.map((a) => `      { action: "${a.action}", label: "${a.label}" },`).join("\n")}
    ],
  },
  server: {
    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(app, "${n.entitlementKey}", async (scoped) => {
        await scoped.register(${n.singular}Routes, { prefix: "${spec.api.prefix}" });
      });
    },
  },
};
`,
  );

  add(
    "server/index.ts",
    `export { ${camel(n.id)}ServerModule } from "./module.js";`,
  );

  // ---- server util（校验 + 长度上限）
  add(
    `server/${n.singular}.util.ts`,
    `
${formFields
  .filter(isText)
  .map(
    (f) =>
      `export const ${maxLenConst(f)} = ${isMultiline(f) ? "10_000" : "200"};`,
  )
  .join("\n")}

export interface ${n.Singular}Input {
${formFields.map((f) => `  ${f.name}?: ${formValueType(f)};`).join("\n")}
}

export function validate${n.Singular}Input(
  input: ${n.Singular}Input,
  options: { partial?: boolean } = {},
): string | null {
  const partial = options.partial ?? false;

${formFields
  .filter((f) => !isBool(f)) // Boolean 只有两个合法值，无从校验
  .map((f) => {
    const required = f.required !== false;
    if (isDate(f)) {
      return `  if (input.${f.name} !== undefined && input.${f.name} !== "") {
    if (Number.isNaN(Date.parse(input.${f.name}))) {
      return "${label(f)}格式不正确";
    }
  }${
    required
      ? `\n  if (!partial && !input.${f.name}) {\n    return "请选择${label(f)}";\n  }`
      : ""
  }`;
    }
    return `  if (!partial || input.${f.name} !== undefined) {
    const ${f.name} = input.${f.name}?.trim() ?? "";
${required ? `    if (!${f.name}) {\n      return "请输入${label(f)}";\n    }\n` : ""}    if (${f.name}.length > ${maxLenConst(f)}) {
      return \`${label(f)}不能超过 \${${maxLenConst(f)}} 个字符\`;
    }
  }`;
  })
  .join("\n\n")}

  return null;
}
`,
  );

  // ---- server mapper
  /*
   * 记录类型的来源分两种：内置模块直接 import 生成的 Prisma client 类型；
   * 外部模块拿不到（module-sdk 只导出 `Prisma` 命名空间，不导出各 model 类型），
   * 改从 prisma 实例上把返回类型推出来——与金标准 modules/todo 一致。
   */
  const mapperHead = n.external
    ? `
import { prisma } from "@rewindom/module-sdk/server";

import type { ${n.Singular}, ${n.Singular}ListItem } from "../shared/index.js";

/** 从 prisma 实例推导记录类型——外部模块拿不到生成的 Prisma client 类型。 */
type ${model.name}Record = NonNullable<
  Awaited<ReturnType<typeof prisma.${n.prismaClient}.findFirst>>
>;
`
    : `
import type { ${n.Singular}, ${n.Singular}ListItem } from "../shared/index.js";
import type { ${model.name} as ${model.name}Record } from "@rewindom/server-kernel/generated/prisma/client/client.js";
`;
  add(
    `server/${n.singular}.mapper.ts`,
    `${mapperHead}

export function to${n.Singular}ListItem(record: ${model.name}Record): ${n.Singular}ListItem {
  return {
    id: record.id,
${fields.map(mapperLine).join("\n")}
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function to${n.Singular}(record: ${model.name}Record): ${n.Singular} {
  return {
    id: record.id,
    tenant_id: record.tenant_id,
${fields.map(mapperLine).join("\n")}
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}
`,
  );

  // ---- server service
  const orderByType = sortWhitelist
    .map((f) => `{ ${f}: "asc" | "desc" }`)
    .join(" | ");
  add(
    `server/${n.singular}.service.ts`,
    `
import { resolveSortField, resolveSortOrder } from "@rewindom/server-kernel/http/list-sort.js";
import { NotFoundError, ValidationError } from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";

import { to${n.Singular}, to${n.Singular}ListItem } from "./${n.singular}.mapper.js";
import { validate${n.Singular}Input } from "./${n.singular}.util.js";

import type { ${n.Singular}, ${n.Singular}ListItem } from "../shared/index.js";

export interface List${n.Plural}Params {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface List${n.Plural}Result {
  items: ${n.Singular}ListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

const ${n.CONST}_SORTABLE_FIELDS = new Set([${sortWhitelist.map((f) => `"${f}"`).join(", ")}]);

function build${n.Singular}OrderBy(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): ${orderByType} {
  const field = resolveSortField(sortBy, ${n.CONST}_SORTABLE_FIELDS, "${defaultSort.by}");
  const order = resolveSortOrder(sortDir, "${defaultSort.dir}");
  return { [field]: order } as ${orderByType};
}

function build${n.Singular}ListWhere(
  tenant_id: string,
  q?: string,
): ReturnType<typeof withTenantScope> {
  return withTenantScope(tenant_id, {
    ...(q?.trim()
      ? {
          OR: [
${searchFields
  .map(
    (f) =>
      `            { ${f}: { contains: q.trim(), mode: "insensitive" as const } },`,
  )
  .join("\n")}
          ],
        }
      : {}),
  });
}

export async function list${n.Plural}(params: List${n.Plural}Params): Promise<List${n.Plural}Result> {
  const { tenant_id, page, page_size, q, sort_by, sort_dir } = params;
  const skip = (page - 1) * page_size;

  const [records, total] = await Promise.all([
    prisma.${n.prismaClient}.findMany({
      where: build${n.Singular}ListWhere(tenant_id, q),
      orderBy: build${n.Singular}OrderBy(sort_by, sort_dir),
      skip,
      take: page_size,
    }),
    prisma.${n.prismaClient}.count({ where: build${n.Singular}ListWhere(tenant_id, q) }),
  ]);

  return {
    items: records.map(to${n.Singular}ListItem),
    page,
    page_size,
    total,
    page_count: Math.ceil(total / page_size),
  };
}

export async function get${n.Singular}(
  tenant_id: string,
  ${n.singular}_id: string,
): Promise<${n.Singular}> {
  const record = await prisma.${n.prismaClient}.findFirst({
    where: withTenantScope(tenant_id, { id: ${n.singular}_id }),
  });
  if (!record) {
    throw new NotFoundError("${spec.entitlement.label}不存在");
  }
  return to${n.Singular}(record);
}

export async function create${n.Singular}(params: {
  tenant_id: string;
  user_id: string;
${formFields.map((f) => `  ${f.name}${f.required === false || isBool(f) ? "?" : ""}: ${formValueType(f)};`).join("\n")}
}): Promise<${n.Singular}> {
  const validationError = validate${n.Singular}Input({
${formFields.map((f) => `    ${f.name}: params.${f.name},`).join("\n")}
  });
  if (validationError) {
    throw new ValidationError(validationError);
  }

  const record = await prisma.${n.prismaClient}.create({
    data: {
      tenant_id: params.tenant_id,
${formFields.map(createDataLine).join("\n")}
${fields.some((f) => f.name === "created_by") ? "      created_by: params.user_id,\n" : ""}    },
  });

  return to${n.Singular}(record);
}

export async function update${n.Singular}(params: {
  tenant_id: string;
  user_id: string;
  ${n.singular}_id: string;
${formFields.map((f) => `  ${f.name}?: ${formValueType(f)};`).join("\n")}
}): Promise<${n.Singular}> {
  const validationError = validate${n.Singular}Input(
    {
${formFields.map((f) => `      ${f.name}: params.${f.name},`).join("\n")}
    },
    { partial: true },
  );
  if (validationError) {
    throw new ValidationError(validationError);
  }

  const existing = await prisma.${n.prismaClient}.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.${n.singular}_id }),
  });
  if (!existing) {
    throw new NotFoundError("${spec.entitlement.label}不存在");
  }

  // 归属校验并进 where：上面的 findFirst 负责给出 404，
  // 这里再带一次租户谓词，使「校验」与「写入」落在同一条语句里。
  const record = await prisma.${n.prismaClient}.update({
    where: withTenantScope(params.tenant_id, { id: params.${n.singular}_id }),
    data: {
${formFields.map(updateDataLine).join("\n")}
${fields.some((f) => f.name === "updated_by") ? "      updated_by: params.user_id,\n" : ""}    },
  });

  return to${n.Singular}(record);
}

export async function delete${n.Singular}(
  tenant_id: string,
  ${n.singular}_id: string,
): Promise<void> {
  const existing = await prisma.${n.prismaClient}.findFirst({
    where: withTenantScope(tenant_id, { id: ${n.singular}_id }),
  });
  if (!existing) {
    throw new NotFoundError("${spec.entitlement.label}不存在");
  }

  // 同 update：租户谓词并进 delete 自身，避免 check-then-act 的时间窗。
  await prisma.${n.prismaClient}.delete({
    where: withTenantScope(tenant_id, { id: ${n.singular}_id }),
  });
}
`,
  );

  // ---- server routes
  const titleField = formFields[0].name;
  add(
    `server/${n.singular}.routes.ts`,
    `
import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import { parseSortDir } from "@rewindom/server-kernel/http/list-sort.js";
import { parsePagination } from "@rewindom/server-kernel/http/pagination.js";
import { NotFoundError, ValidationError } from "@rewindom/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";

${n.external ? "" : `import { AuditAction } from "../../audit/shared/index.js";\n\n`}import {
  create${n.Singular},
  delete${n.Singular},
  get${n.Singular},
  list${n.Plural},
  update${n.Singular},
} from "./${n.singular}.service.js";

import type { FastifyInstance } from "fastify";

export async function ${n.singular}Routes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "${n.Singular}List",
    errorCode: "${n.CONST}_LIST_FAILED",
    preHandler: [app.requirePermission("${n.readPerm}")],
    handler: async (request) => {
      const { q, sort_by, sort_dir } = request.query as {
        q?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );

      return list${n.Plural}({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/:${n.singular}_id",
    context: "${n.Singular}Detail",
    errorCode: "${n.CONST}_DETAIL_FAILED",
    preHandler: [app.requirePermission("${n.readPerm}")],
    handler: async (request, reply) => {
      try {
        const { ${n.singular}_id } = request.params as { ${n.singular}_id: string };
        return await get${n.Singular}(request.tenantContext!.tenant_id, ${n.singular}_id);
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.code(404).send({ error: err.message });
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/",
    context: "${n.Singular}Create",
    errorCode: "${n.CONST}_CREATE_FAILED",
    preHandler: [app.requirePermission("${n.writePerm}")],
    handler: async (request, reply) => {
      try {
        const body = request.body as { ${formFields.map((f) => `${f.name}?: ${formValueType(f)}`).join("; ")} };
        const ${n.singular} = await create${n.Singular}({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
${formFields.map((f) => `          ${f.name}: body.${f.name}${f.required === false || isBool(f) ? "" : ' ?? ""'},`).join("\n")}
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: ${n.auditRef}${n.CONST}_CREATE${n.auditRefEnd},
          resource: ${n.singular}.id,
          details: \`创建${spec.entitlement.label}：\${${n.singular}.${titleField}}\`,
        });

        return ${n.singular};
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.code(400).send({ error: err.message });
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/:${n.singular}_id",
    context: "${n.Singular}Update",
    errorCode: "${n.CONST}_UPDATE_FAILED",
    preHandler: [app.requirePermission("${n.writePerm}")],
    handler: async (request, reply) => {
      try {
        const { ${n.singular}_id } = request.params as { ${n.singular}_id: string };
        const body = request.body as { ${formFields.map((f) => `${f.name}?: ${formValueType(f)}`).join("; ")} };
        const ${n.singular} = await update${n.Singular}({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          ${n.singular}_id,
${formFields.map((f) => `          ${f.name}: body.${f.name},`).join("\n")}
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: ${n.auditRef}${n.CONST}_UPDATE${n.auditRefEnd},
          resource: ${n.singular}.id,
          details: \`更新${spec.entitlement.label}：\${${n.singular}.${titleField}}\`,
        });

        return ${n.singular};
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.code(404).send({ error: err.message });
        }
        if (err instanceof ValidationError) {
          return reply.code(400).send({ error: err.message });
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/:${n.singular}_id",
    context: "${n.Singular}Delete",
    errorCode: "${n.CONST}_DELETE_FAILED",
    preHandler: [app.requirePermission("${n.writePerm}")],
    handler: async (request, reply) => {
      try {
        const { ${n.singular}_id } = request.params as { ${n.singular}_id: string };
        const existing = await get${n.Singular}(
          request.tenantContext!.tenant_id,
          ${n.singular}_id,
        );
        await delete${n.Singular}(request.tenantContext!.tenant_id, ${n.singular}_id);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: ${n.auditRef}${n.CONST}_DELETE${n.auditRefEnd},
          resource: existing.id,
          details: \`删除${spec.entitlement.label}：\${existing.${titleField}}\`,
        });

        return { deleted: true };
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.code(404).send({ error: err.message });
        }
        throw err;
      }
    },
  });
}
`,
  );

  // ---- client manifest / routes / nav
  add(
    "client/module.tsx",
    `
import { ${n.CONST}_ENTITLEMENT } from "../shared/index.js";

import { ${n.CONST}_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { render${n.Plural}Routes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/client-kit";

export const ${camel(n.id)}ClientModule: ClientAppModule = {
  id: "${n.id}",
  version: "1.0.0",
  label: "${spec.label}",
  kind: "${spec.kind}",
  description: "${spec.description ?? spec.label}",
  tenantEntitlements: [${n.CONST}_ENTITLEMENT],
  client: {
    renderRoutes: render${n.Plural}Routes,
    nav: ${n.CONST}_NAV_SECTIONS,${
      spec.options?.mobile_tab
        ? `
    // 底部 tab 只放高频业务入口；管理类页面走抽屉导航
    mobileTabPaths: ["${spec.client.route_path}"],`
        : ""
    }
  },
};
`,
  );

  add(
    "client/tenant/routes.tsx",
    `
import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@rewindom/client-kit";
import { Route } from "react-router";

const ${n.Plural} = lazy(() =>
  import("../pages/${n.plural}.js").then((module) => ({
    default: module.${n.Plural},
  })),
);

export function render${n.Plural}Routes(): ReactNode {
  return (
    <Route element={<TenantModuleRoute moduleId="${n.entitlementKey}" label="${spec.entitlement.label}" />}>
      <Route element={<PermissionRoute permission="${n.readPerm}" />}>
        <Route path="${spec.client.route_path}" element={<${n.Plural} />} />
      </Route>
    </Route>
  );
}
`,
  );

  add(
    "client/tenant/nav-sections.ts",
    `
import { ${spec.client.nav.icon} } from "lucide-react";

import type { AppNavSection } from "@rewindom/client-kit";

export const ${n.CONST}_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "${spec.client.nav.section}",
    items: [
      {
        icon: ${spec.client.nav.icon},
        label: "${spec.client.nav.label}",
        path: "${spec.client.route_path}",
        title: "${spec.client.nav.title}",
        tenantModule: "${n.entitlementKey}",
        anyPermission: ["${n.readPerm}"],
      },
    ],
  },
];
`,
  );

  // ---- client lib + test
  add(
    `client/lib/${n.plural}.ts`,
    `
${formFields
  .filter(isText)
  .map(
    (f) =>
      `export const ${maxLenConst(f)} = ${isMultiline(f) ? "10_000" : "200"};`,
  )
  .join("\n")}

/** DateTime 在表单里是 ISO 串（空串 = 未设置），提交前才交给服务端转 Date */
export interface ${n.Singular}FormValues {
${formFields.map((f) => `  ${f.name}: ${formValueType(f)};`).join("\n")}
}

export const INITIAL_${n.CONST}_FORM: ${n.Singular}FormValues = {
${formFields.map((f) => `  ${f.name}: ${formInitial(f)},`).join("\n")}
};

export function validate${n.Singular}Form(values: ${n.Singular}FormValues): string | null {
${formFields
  .filter((f) => !isBool(f))
  .map((f) => {
    const required = f.required !== false;
    if (isDate(f)) {
      return `${required ? `  if (!values.${f.name}) {\n    return "请选择${label(f)}";\n  }\n` : ""}  if (values.${f.name} && Number.isNaN(Date.parse(values.${f.name}))) {
    return "${label(f)}格式不正确";
  }`;
    }
    return `  const ${f.name} = values.${f.name}.trim();
${required ? `  if (!${f.name}) {\n    return "请输入${label(f)}";\n  }\n` : ""}  if (${f.name}.length > ${maxLenConst(f)}) {
    return \`${label(f)}不能超过 \${${maxLenConst(f)}} 个字符\`;
  }`;
  })
  .join("\n\n")}

  return null;
}

export function build${n.Singular}Payload(values: ${n.Singular}FormValues): {
${formFields.map((f) => `  ${f.name}: ${formValueType(f)};`).join("\n")}
} {
  return {
${formFields.map((f) => `    ${f.name}: values.${f.name}${isText(f) ? ".trim()" : ""},`).join("\n")}
  };
}
`,
  );

  // 测试挑一个必填文本字段做锚点；纯 Boolean/日期表单则退化为「合法输入不报错」
  const textAnchor =
    formFields.find((f) => isText(f) && f.required !== false) ??
    formFields.find(isText);
  const dateAnchor = formFields.find((f) => isDate(f));
  const boolAnchor = formFields.find(isBool);

  const textCases = textAnchor
    ? `
describe("validate${n.Singular}Form", () => {
  it("rejects blank ${textAnchor.name}", () => {
    expect(
      validate${n.Singular}Form({ ...INITIAL_${n.CONST}_FORM, ${textAnchor.name}: "  " }),
    ).toBe("请输入${label(textAnchor)}");
  });

  it("rejects overlong ${textAnchor.name}", () => {
    expect(
      validate${n.Singular}Form({
        ...INITIAL_${n.CONST}_FORM,
        ${textAnchor.name}: "x".repeat(${maxLenConst(textAnchor)} + 1),
      }),
    ).toContain("不能超过");
  });
});
`
    : `
describe("validate${n.Singular}Form", () => {
  it("accepts the initial form", () => {
    expect(validate${n.Singular}Form(INITIAL_${n.CONST}_FORM)).toBeNull();
  });
});
`;

  const dateCase = dateAnchor
    ? `
describe("validate${n.Singular}Form（日期）", () => {
  it("rejects unparsable ${dateAnchor.name}", () => {
    expect(
      validate${n.Singular}Form({
        ...INITIAL_${n.CONST}_FORM,${textAnchor ? `\n        ${textAnchor.name}: "ok",` : ""}
        ${dateAnchor.name}: "not-a-date",
      }),
    ).toContain("格式不正确");
  });
});
`
    : "";

  const payloadCase = `
describe("build${n.Singular}Payload", () => {
  it("${textAnchor ? "trims text and passes other fields through" : "passes fields through"}", () => {
    expect(
      build${n.Singular}Payload({
        ...INITIAL_${n.CONST}_FORM,${textAnchor ? `\n        ${textAnchor.name}: "  x  ",` : ""}${boolAnchor ? `\n        ${boolAnchor.name}: true,` : ""}
      }),
    ).toEqual({
      ...INITIAL_${n.CONST}_FORM,${textAnchor ? `\n      ${textAnchor.name}: "x",` : ""}${boolAnchor ? `\n      ${boolAnchor.name}: true,` : ""}
    });
  });
});
`;

  add(
    `client/lib/${n.plural}.test.ts`,
    `
import { describe, expect, it } from "vitest";

import {
  build${n.Singular}Payload,
  INITIAL_${n.CONST}_FORM,${textAnchor ? `\n  ${maxLenConst(textAnchor)},` : ""}
  validate${n.Singular}Form,
} from "./${n.plural}.js";
${textCases}${dateCase}${payloadCase}`,
  );

  // ---- client hooks
  add(
    `client/hooks/use${n.Plural}.ts`,
    `
import { api } from "@rewindom/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ${n.Singular}ListItem } from "../../shared/index.js";

const ${n.CONST}S_KEY = ["${n.plural}"] as const;

export function use${n.Plural}(
  page?: number,
  pageSize?: number,
  q?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...${n.CONST}S_KEY, page, pageSize, q, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: ${n.Singular}ListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("${spec.api.prefix.replace("/api", "")}", params);
    },
  });
}
`,
  );

  add(
    `client/hooks/use${n.Singular}.ts`,
    `
import { api } from "@rewindom/client-kit";
import { useQuery } from "@tanstack/react-query";

import type { ${n.Singular} } from "../../shared/index.js";

export function use${n.Singular}(${n.singular}Id: string | null, enabled = true) {
  return useQuery({
    queryKey: ["${n.plural}", ${n.singular}Id],
    queryFn: () => api.get<${n.Singular}>(\`${spec.api.prefix.replace("/api", "")}/\${${n.singular}Id}\`),
    enabled: enabled && Boolean(${n.singular}Id),
  });
}
`,
  );

  add(
    `client/hooks/use${n.Singular}Mutations.ts`,
    `
import { api } from "@rewindom/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  Create${n.Singular}Body,
  ${n.Singular},
  Update${n.Singular}Body,
} from "../../shared/index.js";

export function useCreate${n.Singular}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Create${n.Singular}Body) =>
      api.post<${n.Singular}>("${spec.api.prefix.replace("/api", "")}", body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["${n.plural}"] });
    },
  });
}

export function useUpdate${n.Singular}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Update${n.Singular}Body & { id: string }) =>
      api.patch<${n.Singular}>(\`${spec.api.prefix.replace("/api", "")}/\${id}\`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["${n.plural}"] });
    },
  });
}

export function useDelete${n.Singular}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(\`${spec.api.prefix.replace("/api", "")}/\${id}\`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["${n.plural}"] });
    },
  });
}
`,
  );

  add(
    `client/hooks/use${n.Plural}Page.ts`,
    `
import { useCallback } from "react";

import {
  applyFiltersToSearchParams,
  applySortingToSearchParams,
  parseListPage,
  parseListPageSize,
  parseListSort,
  toSortingState,
} from "@rewindom/client-kit/lib/list-url-params";
import { useSearchParams } from "react-router";

import type { SortingState, Updater } from "@tanstack/react-table";

export function use${n.Plural}Page() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const page = parseListPage(searchParams.get("page"));
  const pageSize = parseListPageSize(searchParams.get("page_size"));
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSearchParams(
        applySortingToSearchParams(searchParams, updater, sorting),
      );
    },
    [searchParams, setSearchParams, sorting],
  );

  const handleFiltersChange = useCallback(
    (filters: { q?: string }) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, { q: filters.q }),
      );
    },
    [searchParams, setSearchParams],
  );

  return {
    q,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  };
}
`,
  );

  // ---- client components
  add(
    `client/components/${n.Singular}Filters.tsx`,
    `
import { PageFilterBar } from "@rewindom/client-kit";

interface ${n.Singular}FiltersProps {
  q?: string;
  onFiltersChange: (filters: { q?: string }) => void;
}

export function ${n.Singular}Filters({ q, onFiltersChange }: ${n.Singular}FiltersProps) {
  return (
    <PageFilterBar
      search={{
        value: q,
        onCommit: (value) => {
          onFiltersChange({ q: value.trim() || undefined });
        },
        placeholder: "搜索${searchFields.map((f) => fields.find((x) => x.name === f)?.label ?? f).join(" / ")}…",
        className: "max-w-56",
      }}
      hasActiveFilters={Boolean(q)}
      onReset={() => onFiltersChange({ q: undefined })}
    />
  );
}
`,
  );

  /**
   * Boolean 列就地可切换（待办清单的核心交互就是这一下），
   * 所以 cell 里直接挂 update mutation，而不是只读地渲染个图标。
   */
  const cellFor = (f) => {
    if (isBool(f)) {
      return `        cell: ({ row }) => (
          <Checkbox
            checked={row.original.${f.name}}
            disabled={!canWrite || togglingId === row.original.id}
            aria-label="${label(f)}"
            onCheckedChange={(checked) =>
              void handleToggle${pascal(f.name)}(row.original, checked === true)
            }
          />
        ),`;
    }
    if (isDate(f)) {
      return `        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.${f.name}
              ? formatBusinessDate(row.original.${f.name})
              : "—"}
          </span>
        ),`;
    }
    return `        cell: ({ row }) => (
          <div className="${isMultiline(f) ? "text-muted-foreground line-clamp-2 max-w-xl text-sm" : "font-medium"}">
            {row.original.${f.name} || "—"}
          </div>
        ),`;
  };

  const columnDefs = formFields
    .map((f) => {
      const sortable = sortWhitelist.includes(f.name);
      return `      {
        accessorKey: "${f.name}",
        header: ${
          sortable
            ? `({ column }) => (\n          <DataTableColumnHeader column={column} title="${label(f)}" />\n        )`
            : `"${label(f)}"`
        },${sortable ? "\n        enableSorting: true," : ""}
${cellFor(f)}
      },`;
    })
    .join("\n");

  const boolFields = formFields.filter(isBool);
  const tableUsesDate = formFields.some(isDate);

  /** Boolean 列的就地切换 handler（每个 Boolean 字段一个） */
  const toggleHandlers = boolFields
    .map(
      (f) => `  const handleToggle${pascal(f.name)} = useCallback(
    async (item: ${n.Singular}ListItem, next: boolean) => {
      setTogglingId(item.id);
      try {
        await updateMutation.mutateAsync({ id: item.id, ${f.name}: next });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "更新失败，请重试");
      } finally {
        setTogglingId(null);
      }
    },
    [updateMutation],
  );`,
    )
    .join("\n\n");

  add(
    `client/components/${n.Plural}Table.tsx`,
    `
import { useCallback, useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  useConfirm,
  usePermissions,
} from "@rewindom/client-kit";
import { ${tableUsesDate ? "formatBusinessDate, " : ""}formatBusinessDateOrTimeAgo } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
${boolFields.length > 0 ? `import { Checkbox } from "@rewindom/ui/checkbox";\n` : ""}import { toast } from "@rewindom/ui/toast";
import { ${spec.client.nav.icon}, Trash2 } from "lucide-react";

import {
  useDelete${n.Singular},${boolFields.length > 0 ? `\n  useUpdate${n.Singular},` : ""}
} from "../hooks/use${n.Singular}Mutations.js";

import { ${n.Singular}EditSheet } from "./${n.Singular}EditSheet.js";

import type { ${n.Singular}ListItem } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

interface ${n.Plural}TableProps {
  items: ${n.Singular}ListItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  q?: string;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  onRetry: () => void;
}

export function ${n.Plural}Table({
  items,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  total,
  pageCount,
  q,
  sorting,
  onSortingChange,
  onRetry,
}: ${n.Plural}TableProps) {
  const { confirm } = useConfirm();
  const deleteMutation = useDelete${n.Singular}();
${boolFields.length > 0 ? `  const updateMutation = useUpdate${n.Singular}();\n` : ""}  const { hasPermission } = usePermissions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
${boolFields.length > 0 ? `  const [togglingId, setTogglingId] = useState<string | null>(null);\n` : ""}  const canWrite = hasPermission("${n.writePerm}");

${toggleHandlers ? `${toggleHandlers}\n\n` : ""}  const handleDelete = useCallback(
    async (item: ${n.Singular}ListItem) => {
      const confirmed = await confirm({
        title: "删除${spec.entitlement.label}",
        description: \`确定删除「\${item.${titleField}}」吗？此操作不可撤销。\`,
        destructive: true,
      });
      if (!confirmed) {
        return;
      }

      setDeletingId(item.id);
      try {
        await deleteMutation.mutateAsync(item.id);
        toast.success("已删除");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "删除失败，请重试");
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, deleteMutation],
  );

  const columns = useMemo<ColumnDef<${n.Singular}ListItem>[]>(
    () => [
${columnDefs}
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="更新时间" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatBusinessDateOrTimeAgo(row.original.updated_at)}
          </span>
        ),
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "操作",
              cell: ({ row }: { row: { original: ${n.Singular}ListItem } }) => (
                <div className="flex items-center gap-1">
                  <${n.Singular}EditSheet item={row.original} />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="删除"
                    disabled={deletingId === row.original.id}
                    onClick={() => void handleDelete(row.original)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<${n.Singular}ListItem>,
          ]
        : []),
    ],
    [canWrite, deletingId, handleDelete${boolFields.map((f) => `, togglingId, handleToggle${pascal(f.name)}`).join("")}],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      isLoading={isLoading && items.length === 0}
      isError={isError && items.length === 0}
      error={error}
      page={page}
      pageSize={pageSize}
      total={total}
      pageCount={pageCount}
      emptyIcon={<${spec.client.nav.icon} className="size-10" />}
      emptyHeader="暂无${spec.entitlement.label}"
      emptyMessage={
        q ? "没有匹配的记录，请调整搜索条件。" : "创建第一条记录开始使用。"
      }
      onRetry={onRetry}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  );
}
`,
  );

  const formField = (f, idSuffix) => {
    const id = idSuffix
      ? `\`${n.singular}-${f.name}-\${item.id}\``
      : `"${n.singular}-${f.name}"`;

    // Boolean 走 Switch，横向排布（label 在左、开关在右），不套 FieldLabel htmlFor 的竖排
    if (isBool(f)) {
      return `            <Field orientation="horizontal">
              <FieldLabel htmlFor={${id}}>${label(f)}</FieldLabel>
              <Switch
                id={${id}}
                checked={form.${f.name}}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, ${f.name}: checked }))
                }
              />
            </Field>`;
    }

    // DateTime：Popover + Calendar 单选，表单里存 ISO 串
    if (isDate(f)) {
      return `            <Field>
              <FieldLabel htmlFor={${id}}>${label(f)}</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id={${id}}
                    type="button"
                    variant="outline"
                    className="justify-start font-normal"
                  >
                    <CalendarIcon className="size-4" />
                    {form.${f.name}
                      ? formatBusinessDate(form.${f.name})
                      : "选择${label(f)}"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.${f.name} ? new Date(form.${f.name}) : undefined}
                    onSelect={(date) =>
                      setForm((prev) => ({
                        ...prev,
                        ${f.name}: date ? date.toISOString() : "",
                      }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </Field>`;
    }

    const control = isMultiline(f)
      ? `<Textarea
                id={${id}}
                className="min-h-40"
                value={form.${f.name}}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, ${f.name}: event.target.value }))
                }
              />`
      : `<Input
                id={${id}}
                value={form.${f.name}}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, ${f.name}: event.target.value }))
                }
              />`;
    return `            <Field>
              <FieldLabel htmlFor={${id}}>${label(f)}</FieldLabel>
              ${control}
            </Field>`;
  };

  const usesTextarea = formFields.some(isMultiline);
  const usesInput = formFields.some((f) => isText(f) && !isMultiline(f));
  const usesSwitch = formFields.some(isBool);
  const usesDate = formFields.some(isDate);
  // 分成两段是为了插在 sheet/spinner 两组 import 之间时仍满足 import 排序规则
  const controlImports = [
    [
      usesDate ? `import { Calendar } from "@rewindom/ui/calendar";` : null,
      usesInput ? `import { Input } from "@rewindom/ui/input";` : null,
      usesDate
        ? `import {\n  Popover,\n  PopoverContent,\n  PopoverTrigger,\n} from "@rewindom/ui/popover";`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
    [
      usesSwitch ? `import { Switch } from "@rewindom/ui/switch";` : null,
      usesTextarea ? `import { Textarea } from "@rewindom/ui/textarea";` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  ];
  const sheetExtraImports = usesDate
    ? `import { formatBusinessDate } from "@rewindom/shared";\n`
    : "";
  const sheetIconImport = (icon) =>
    usesDate
      ? `import { Calendar as CalendarIcon, ${icon} } from "lucide-react";`
      : `import { ${icon} } from "lucide-react";`;

  add(
    `client/components/${n.Singular}CreateSheet.tsx`,
    `
import { useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError } from "@rewindom/client-kit";
${sheetExtraImports}import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
${controlImports[0]}
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
${controlImports[1]}
import { toast } from "@rewindom/ui/toast";
${sheetIconImport("Plus")}

import { useCreate${n.Singular} } from "../hooks/use${n.Singular}Mutations.js";
import {
  build${n.Singular}Payload,
  INITIAL_${n.CONST}_FORM,
  validate${n.Singular}Form,
  type ${n.Singular}FormValues,
} from "../lib/${n.plural}.js";

interface ${n.Singular}CreateSheetProps {
  children?: ReactNode;
}

export function ${n.Singular}CreateSheet({ children }: ${n.Singular}CreateSheetProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<${n.Singular}FormValues>(INITIAL_${n.CONST}_FORM);
  const [error, setError] = useState("");
  const createMutation = useCreate${n.Singular}();

  const reset = () => {
    setForm(INITIAL_${n.CONST}_FORM);
    setError("");
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validate${n.Singular}Form(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await createMutation.mutateAsync(build${n.Singular}Payload(form));
      toast.success("已创建");
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "创建失败，请重试");
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <SheetTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="size-4" />
            新建${spec.entitlement.label}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>新建${spec.entitlement.label}</SheetTitle>
            <SheetDescription>填写下面的字段后保存。</SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
${formFields.map((f) => formField(f, false)).join("\n")}
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </SheetClose>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner className="size-4" /> : null}
              保存
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
`,
  );

  add(
    `client/components/${n.Singular}EditSheet.tsx`,
    `
import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError } from "@rewindom/client-kit";
${sheetExtraImports}import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
${controlImports[0]}
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
${controlImports[1]}
import { toast } from "@rewindom/ui/toast";
${sheetIconImport("Pencil")}

import { use${n.Singular} } from "../hooks/use${n.Singular}.js";
import { useUpdate${n.Singular} } from "../hooks/use${n.Singular}Mutations.js";
import {
  build${n.Singular}Payload,
  INITIAL_${n.CONST}_FORM,
  validate${n.Singular}Form,
  type ${n.Singular}FormValues,
} from "../lib/${n.plural}.js";

import type { ${n.Singular}ListItem } from "../../shared/index.js";

interface ${n.Singular}EditSheetProps {
  item: ${n.Singular}ListItem;
  children?: ReactNode;
}

export function ${n.Singular}EditSheet({ item, children }: ${n.Singular}EditSheetProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<${n.Singular}FormValues>(INITIAL_${n.CONST}_FORM);
  const [error, setError] = useState("");
  const { data: detail, isLoading } = use${n.Singular}(item.id, open);
  const updateMutation = useUpdate${n.Singular}();

  useEffect(() => {
    if (detail) {
      setForm({
${formFields
  .map(
    (f) =>
      `        ${f.name}: detail.${f.name}${f.required === false ? (isBool(f) ? " ?? false" : ' ?? ""') : ""},`,
  )
  .join("\n")}
      });
      setError("");
    }
  }, [detail]);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validate${n.Singular}Form(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: item.id,
        ...build${n.Singular}Payload(form),
      });
      toast.success("已更新");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "更新失败，请重试");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button size="icon" variant="ghost" aria-label="编辑">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>编辑${spec.entitlement.label}</SheetTitle>
            <SheetDescription>修改后保存即可生效。</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : (
            <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
${formFields.map((f) => formField(f, true)).join("\n")}
              {error ? <FieldError>{error}</FieldError> : null}
            </FieldGroup>
          )}

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={updateMutation.isPending || isLoading}
            >
              {updateMutation.isPending ? <Spinner className="size-4" /> : null}
              保存
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
`,
  );

  // ---- client page
  add(
    `client/pages/${n.plural}.tsx`,
    `
import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Plus, ${spec.client.nav.icon} } from "lucide-react";

import { ${n.Singular}CreateSheet } from "../components/${n.Singular}CreateSheet.js";
import { ${n.Singular}Filters } from "../components/${n.Singular}Filters.js";
import { ${n.Plural}Table } from "../components/${n.Plural}Table.js";
import { use${n.Plural} } from "../hooks/use${n.Plural}.js";
import { use${n.Plural}Page } from "../hooks/use${n.Plural}Page.js";

export function ${n.Plural}() {
  const {
    q,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  } = use${n.Plural}Page();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("${n.writePerm}");
  const { data, isLoading, isError, error, refetch } = use${n.Plural}(
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
  );

  return (
    <PageLayout
      icon={${spec.client.nav.icon}}
      title="${spec.client.nav.title}"
      description="${spec.description ?? spec.label}"
      action={
        canWrite ? (
          <${n.Singular}CreateSheet>
            <DraggableFabTrigger storageKey="${n.plural}_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">新建${spec.entitlement.label}</span>
            </DraggableFabTrigger>
          </${n.Singular}CreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <${n.Singular}Filters q={q} onFiltersChange={handleFiltersChange} />
        <${n.Plural}Table
          items={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          pageCount={data?.page_count}
          q={q}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          onRetry={() => void refetch()}
        />
      </div>
    </PageLayout>
  );
}
`,
  );

  // ---- MODULE.md
  add(
    "MODULE.md",
    `
# module-${n.id}

由 \`scripts/gen-module.mjs\` 从 \`MODULE.spec.yaml\` 生成。改需求请改 spec 后重新生成，
或在此记录手工偏离之处。

## 用途

${spec.description ?? spec.label}

## 面划分

| 面 | 路由 | 目录 | 所需权限 |
| --- | --- | --- | --- |
| 租户侧 | \`${spec.client.route_path}\` | \`client/\` | \`${n.readPerm}\`（写操作另需 \`${n.writePerm}\`） |

## 权限控制

四处必须同时收窄，缺一处就会出现「看得见点不进」或「点得进但请求 403」：

| 位置 | 文件 | 收窄方式 |
| --- | --- | --- |
| 路由 | \`server/${n.singular}.routes.ts\` | \`app.requirePermission\` |
| 导航项 | \`client/tenant/nav-sections.ts\` | \`anyPermission: ["${n.readPerm}"]\` |
| 页面路由 | \`client/tenant/routes.tsx\` | \`PermissionRoute permission="${n.readPerm}"\` |
| 页面内写操作 | \`client/pages/${n.plural}.tsx\`、\`client/components/${n.Plural}Table.tsx\` | \`hasPermission("${n.writePerm}")\` |

## 依赖

${(spec.requires ?? []).map((r) => `- \`module-${r}\``).join("\n") || "- 无"}

## 如何单独测试

\`\`\`bash
${
  n.external
    ? `pnpm --filter ${n.pkg} test`
    : `pnpm --filter @rewindom/builtin test --project ${n.id}/client`
}
\`\`\`
`,
  );

  // ---- 外部模块的包元文件（内置模块共享 @rewindom/builtin 那一份，不需要）
  if (n.external) {
    add(
      "package.json",
      JSON.stringify(
        {
          name: n.pkg,
          version: "0.0.0",
          private: true,
          type: "module",
          // 组装层按这两个入口拿 manifest；"./*" 兜住 shared/ 的深路径引用
          exports: {
            "./server/index.js": "./server/index.ts",
            "./client/module.js": "./client/module.tsx",
            "./*": "./*",
          },
          scripts: {
            test: "vitest --run",
            "test:watch": "vitest",
            typecheck: "tsc -p tsconfig.json --noEmit",
          },
          dependencies: {
            "@rewindom/module-sdk": "workspace:*",
            "@rewindom/ui": "workspace:*",
            "@tanstack/react-query": "^5.101.4",
            "lucide-react": "^1.33.0",
          },
          // 宿主提供的运行时：由 apps/* 统一定版，模块不各自锁
          peerDependencies: {
            fastify: "^5.11.3",
            react: "^19.0.0",
            "react-dom": "^19.0.0",
            "react-router": "^8.0.0",
          },
          devDependencies: {
            "@rewindom/client-test": "workspace:*",
            "@rewindom/server-test": "workspace:*",
            "@testing-library/jest-dom": "^7.0.1",
            "@testing-library/react": "^16.3.2",
            "@types/react": "^19.2.18",
            "@types/react-dom": "^19.2.4",
            "happy-dom": "^20.11.6",
            msw: "^2.15.0",
            vitest: "^4.1.11",
          },
          // gen:external-modules 认这个字段：模块 id、Prisma 片段位置、依赖图
          rewindom: {
            moduleId: n.id,
            prismaSchema: "./prisma/schema.prisma",
            requires: spec.requires ?? [],
          },
        },
        null,
        2,
      ),
    );

    add(
      "tsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM"],
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            jsx: "react-jsx",
            resolveJsonModule: true,
          },
          include: [
            "shared/**/*.ts",
            "server/**/*.ts",
            "client/**/*.ts",
            "client/**/*.tsx",
          ],
          exclude: ["node_modules", "**/*.test.ts", "**/*.test.tsx"],
        },
        null,
        2,
      ),
    );

    add(
      "vitest.config.ts",
      `
import { existsSync } from "node:fs";
import path from "node:path";

import { createModuleClientTestProject } from "@rewindom/client-test/vitest";
import {
  createModuleServerTestProject,
  createModuleSharedTestProject,
} from "@rewindom/server-test/vitest";
import { defineConfig } from "vitest/config";

const ROOT = import.meta.dirname;

/** 三个 project 同名会让 \`--project\` 过滤不掉，逐个显式命名 */
function named<T extends { test?: Record<string, unknown> }>(
  project: T,
  name: string,
): T {
  return { ...project, test: { ...(project.test ?? {}), name } };
}

export default defineConfig({
  test: {
    projects: [
      ...(existsSync(path.join(ROOT, "server"))
        ? [named(createModuleServerTestProject(ROOT), "server")]
        : []),
      ...(existsSync(path.join(ROOT, "client"))
        ? [named(createModuleClientTestProject(ROOT), "client")]
        : []),
      ...(existsSync(path.join(ROOT, "shared"))
        ? [named(createModuleSharedTestProject(ROOT), "shared")]
        : []),
    ],
  },
});
`,
    );

    // 只改 server/ client/ shared/ 下的源码；包元文件与 vitest 配置照原样
    for (const [rel, content] of Object.entries(files)) {
      const area = rel.split("/")[0];
      if (!["server", "client", "shared"].includes(area)) continue;
      if (!/\.tsx?$/u.test(rel)) continue;
      files[rel] = rewriteSdkImports(content, area);
    }
  }

  return { files, auditActions };
}

const camel = (s) => s.replace(/-(\w)/gu, (_, c) => c.toUpperCase());

// ---------------------------------------------------------------- 装配（改既有文件）

function patchRegistries(spec, n) {
  const patches = [];

  /*
   * 外部模块的登记**一处都不在这里**：两处 external-modules.ts、Prisma 符号链接、
   * tenant-models、tenant-guard、静态 module-manifest，全由 gen:external-modules
   * 扫 `modules/*` 生成。在这里再写一遍只会和它打架——它是幂等重生成，
   * 手写进去的行下一次会被覆盖或判成漂移。
   */
  if (n.external) return patches;

  const serverPath = path.join(ROOT, "apps/server/src/enabled-modules.ts");
  const serverText = readFileSync(serverPath, "utf8");
  const serverConst = `${camel(n.id)}ServerModule`;
  if (!serverText.includes(serverConst)) {
    patches.push([
      serverPath,
      serverText
        .replace(
          /(import type \{ ServerAppModule)/u,
          `import { ${serverConst} } from "@rewindom/builtin/${n.id}/server/index.js";\n\n$1`,
        )
        .replace(
          /(\n\] as const satisfies readonly ServerAppModule)/u,
          `\n  ${serverConst},$1`,
        ),
    ]);
  }

  const clientPath = path.join(ROOT, "apps/client/src/enabled-modules.ts");
  const clientText = readFileSync(clientPath, "utf8");
  const clientConst = `${camel(n.id)}ClientModule`;
  if (!clientText.includes(clientConst)) {
    patches.push([
      clientPath,
      clientText
        .replace(
          /(import \{ appShellClientModule)/u,
          `import { ${clientConst} } from "@rewindom/builtin/${n.id}/client/module.js";\n\n$1`,
        )
        .replace(
          /(\n\] as const satisfies readonly ClientAppModule)/u,
          `\n  ${clientConst},$1`,
        ),
    ]);
  }

  // 租户模型登记（eslint-rules/tenant-scope 与 verify-module 都依赖它）
  const modelsPath = path.join(ROOT, "eslint-rules/tenant-models.json");
  const models = JSON.parse(readFileSync(modelsPath, "utf8"));
  if (!(n.prismaClient in models)) {
    models[n.prismaClient] = "tenant_id";
    patches.push([modelsPath, `${JSON.stringify(models, null, 2)}\n`]);
  }

  // CI 用的静态模块清单：不启动运行时也要能算依赖图，必须与 ENABLED_SERVER_MODULES 逐字一致
  const staticManifestPath = path.join(
    ROOT,
    "apps/server/scripts/lib/module-manifest.ts",
  );
  const staticText = readFileSync(staticManifestPath, "utf8");
  if (!staticText.includes(`id: "${n.id}"`)) {
    const requires = spec.requires ?? [];
    const entry =
      `  {\n    id: "${n.id}",\n    kind: "${spec.kind}",` +
      (requires.length > 0
        ? `\n    requires: [${requires.map((r) => `"${r}"`).join(", ")}],`
        : "") +
      "\n  },\n";
    patches.push([
      staticManifestPath,
      staticText.replace(
        /(\n\] as const satisfies readonly ModuleManifestEntry\[\];)/u,
        `\n${entry}$1`.replace(/^\n/u, ""),
      ),
    ]);
  }

  // tenant-guard 的模型归属表：未登记的模型会让 Prisma client 启动即失败（fail-closed）
  const guardPath = path.join(
    ROOT,
    "packages/server-kernel/src/lib/tenant-guard.ts",
  );
  const guardText = readFileSync(guardPath, "utf8");
  if (!new RegExp(`^  ${n.model}:`, "mu").test(guardText)) {
    patches.push([
      guardPath,
      guardText.replace(
        /(const MODEL_POLICIES: Record<string, ModelPolicy> = \{\n)/u,
        `$1  ${n.model}: { kind: "tenant_id" },\n`,
      ),
    ]);
  }

  return patches;
}

/** 审计动作要在 audit 模块登记三处，漏一处标签就变 undefined */
function patchAuditActions(auditActions, spec) {
  const auditPath = path.join(ROOT, "packages/builtin/audit/shared/audit.ts");
  let text = readFileSync(auditPath, "utf8");
  const missing = auditActions.filter((a) => !text.includes(`${a.action}:`));
  if (missing.length === 0) return [];

  text = text.replace(
    /\n\} as const;\n\nexport type AuditActionType/u,
    `\n${missing.map((a) => `  ${a.action}: "${a.action}",`).join("\n")}\n} as const;\n\nexport type AuditActionType`,
  );
  text = text.replace(
    /(\n\};\n\nexport const AUDIT_ACTION_GROUPS)/u,
    `\n${missing.map((a) => `  [AuditAction.${a.action}]: "${a.label}",`).join("\n")}$1`,
  );
  text = text.replace(
    /(\n\] as const;\n\nexport interface AuditLog)/u,
    `\n  {\n    label: "${spec.label}",\n    actions: [\n${missing
      .map((a) => `      AuditAction.${a.action},`)
      .join("\n")}\n    ],\n  },$1`,
  );
  return [[auditPath, text]];
}

// ---------------------------------------------------------------- 主流程

const spec = parseYaml(readFileSync(path.resolve(specPath), "utf8"));
validateSpec(spec);
const n = deriveNames(spec);

const moduleDir = path.join(ROOT, n.placement);
if (existsSync(moduleDir) && !FORCE) {
  fail(`模块目录已存在：${n.placement}（要覆盖加 --force）`);
}

const { files, auditActions } = buildFiles(spec, n);
const patches = [
  ...patchRegistries(spec, n),
  ...patchAuditActions(auditActions, spec),
];
// 外部模块的符号链接由 gen:external-modules 建，这里只管内置模块那条
const symlinkPath = n.external
  ? null
  : path.join(ROOT, "apps/server/prisma/models", `${n.id}.prisma`);

if (DRY) {
  console.log(`将生成 ${n.placement}/：`);
  for (const rel of Object.keys(files).sort()) console.log(`  + ${rel}`);
  console.log("\n将修改：");
  for (const [p] of patches) console.log(`  ~ ${path.relative(ROOT, p)}`);
  if (symlinkPath) {
    console.log(`  + ${path.relative(ROOT, symlinkPath)}（符号链接）`);
  } else {
    console.log(
      "\n注册表与 Prisma 符号链接由 pnpm gen:external-modules 生成（见下方步骤）",
    );
  }
  process.exit(0);
}

if (FORCE && existsSync(moduleDir)) rmSync(moduleDir, { recursive: true });
for (const [rel, content] of Object.entries(files)) {
  const full = path.join(moduleDir, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}
cpSync(path.resolve(specPath), path.join(moduleDir, "MODULE.spec.yaml"));

for (const [p, content] of patches) writeFileSync(p, content);

if (symlinkPath && !existsSync(symlinkPath)) {
  symlinkSync(
    `../../../../packages/builtin/${n.id}/models.prisma`,
    symlinkPath,
  );
}

// 生成物必须与手写代码同一套格式/导入顺序，否则第一次 lint 就是一屏红
const touched = [moduleDir, ...patches.map(([p]) => p)];
try {
  execFileSync("npx", ["prettier", "--write", ...touched], {
    cwd: ROOT,
    stdio: "pipe",
  });
  /*
   * 外部模块跳过 eslint：`modules/*` 在这个仓库里没有 eslint 配置——根 eslint.config.js
   * 只声明 ignores，每个包各带一份，而 note / todo / shop 都没带。硬跑只会得到
   * 「all files are ignored」，然后把一条假警告糊在生成结果后面。
   * 被改到的既有文件（audit.ts 等）仍在 packages/ 下，照常跑。
   */
  const lintTargets = n.external ? patches.map(([p]) => p) : touched;
  if (lintTargets.length > 0) {
    execFileSync("npx", ["eslint", "--fix", ...lintTargets], {
      cwd: ROOT,
      stdio: "pipe",
    });
  }
} catch (err) {
  console.warn(
    `⚠ 自动格式化/修复未完全通过，请手动跑 lint：\n${err.stdout?.toString() ?? err.message}`,
  );
}

console.log(`✅ 已生成 ${n.placement}/（${Object.keys(files).length} 个文件）`);
for (const [p] of patches) console.log(`   ~ ${path.relative(ROOT, p)}`);
if (symlinkPath) console.log(`   + ${path.relative(ROOT, symlinkPath)}`);

/*
 * 外部模块多两步且**有先后**：新包要先 pnpm install 链进 workspace，
 * gen:external-modules 生成的注册表才 import 得到 @rewindom/<id>。
 */
const nextSteps = n.external
  ? [
      "pnpm install（新 workspace 包要先链进来）",
      "pnpm gen:external-modules（两处注册表 + Prisma 符号链接 + 四处登记）",
      `node scripts/verify-module.mjs ${n.id}`,
      `pnpm --filter server exec prisma migrate dev --name add_${n.id}`,
      `在 /roles 给角色勾选 ${n.readPerm} / ${n.writePerm}`,
      `业务逻辑在 server/${n.singular}.service.ts 里补`,
    ]
  : [
      `node scripts/verify-module.mjs ${n.id}`,
      `pnpm --filter server exec prisma migrate dev --name add_${n.id}`,
      `在 /roles 给角色勾选 ${n.readPerm} / ${n.writePerm}`,
      `业务逻辑在 server/${n.singular}.service.ts 里补`,
    ];
console.log(
  `\n接下来：\n${nextSteps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`,
);
