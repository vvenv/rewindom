/**
 * 极简 frontmatter 解析。
 *
 * 只支持 `key: value` 标量（值可带引号），不支持嵌套、数组与多行——
 * 文档页只需要 slug/title/description，为此引一个 YAML 依赖不值当。
 * 写了不支持的语法会被当成普通字符串，而不是静默丢字段。
 */

export interface ParsedFrontmatter {
  data: Record<string, string>;
  body: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 1)
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = FRONTMATTER_PATTERN.exec(raw);
  if (!match) {
    return { data: {}, body: raw.trim() };
  }

  const data: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/u)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    if (key === "") {
      continue;
    }
    data[key] = stripQuotes(line.slice(separator + 1));
  }

  return { data, body: raw.slice(match[0].length).trim() };
}
