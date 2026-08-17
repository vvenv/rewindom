/**
 * 依赖内联的 RSS 2.0 / Atom 解析器。
 *
 * 仓库里没有任何 XML 依赖，为一个 connector 引入 fast-xml-parser 这类包
 * 得让整个 monorepo 承担它的供应链与升级成本。feed 的结构又极窄——
 * 只需要 title / link / id / date / summary 五个字段，正则够用且能单测穷举。
 *
 * 明确的边界：不做命名空间解析、不做 XML 校验、不处理嵌套同名标签。
 * 遇到解析不出的条目就跳过，不让一条畸形 item 毁掉整轮抓取。
 */

export interface ParsedFeedItem {
  /** guid（RSS）或 id（Atom）；两者都缺时回落到 link */
  id: string;
  title: string;
  link: string;
  summary: string;
  author: string | null;
  /** 解析不出日期时为 null，由调用方决定用抓取时间兜底 */
  published_at: Date | null;
}

const ITEM_BLOCK_RE = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gu;

export function parseFeed(xml: string): ParsedFeedItem[] {
  const items: ParsedFeedItem[] = [];
  for (const match of xml.matchAll(ITEM_BLOCK_RE)) {
    const block = match[2];
    const item = parseFeedItem(block);
    if (item) {
      items.push(item);
    }
  }
  return items;
}

function parseFeedItem(block: string): ParsedFeedItem | null {
  const title = readTag(block, "title");
  const link = readLink(block);
  if (!title || !link) {
    return null;
  }

  const id = readTag(block, "guid") ?? readTag(block, "id") ?? link;
  const summary =
    readTag(block, "description") ??
    readTag(block, "summary") ??
    readTag(block, "content") ??
    "";

  return {
    id,
    title,
    link,
    summary: stripHtml(summary),
    author: readAuthor(block),
    published_at: readDate(block),
  };
}

/**
 * Atom 的 link 是属性（`<link href="…" rel="alternate"/>`），RSS 的是文本。
 * rel="self" / rel="replies" 指向的不是文章本身，必须排除。
 */
function readLink(block: string): string | null {
  const text = readTag(block, "link");
  if (text?.startsWith("http")) {
    return text;
  }
  const candidates = [
    ...block.matchAll(/<link\b([^>]*)\/?>/giu),
  ].map((m) => m[1]);
  for (const attrs of candidates) {
    const rel = /\brel\s*=\s*["']([^"']*)["']/iu.exec(attrs)?.[1];
    if (rel && rel !== "alternate") {
      continue;
    }
    const href = /\bhref\s*=\s*["']([^"']*)["']/iu.exec(attrs)?.[1];
    if (href) {
      return decodeEntities(href);
    }
  }
  return null;
}

function readAuthor(block: string): string | null {
  const creator = readTag(block, "dc:creator");
  if (creator) {
    return creator;
  }
  // Atom 的 <author> 是容器，真正的名字在里面的 <name>
  const authorBlock = /<author\b[^>]*>([\s\S]*?)<\/author>/iu.exec(block)?.[1];
  if (authorBlock) {
    return readTag(authorBlock, "name") ?? (stripHtml(authorBlock) || null);
  }
  return null;
}

function readDate(block: string): Date | null {
  for (const tag of ["pubDate", "published", "updated", "dc:date"]) {
    const raw = readTag(block, tag);
    if (!raw) {
      continue;
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

/** 取 `<tag …>…</tag>` 的文本内容；剥 CDATA 与实体，空白折叠。 */
export function readTag(block: string, tag: string): string | null {
  const re = new RegExp(
    `<${escapeForRegExp(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeForRegExp(tag)}>`,
    "iu",
  );
  const raw = re.exec(block)?.[1];
  if (raw === undefined) {
    return null;
  }
  const text = decodeEntities(stripCdata(raw)).replace(/\s+/gu, " ").trim();
  return text.length > 0 ? text : null;
}

function stripCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, "$1");
}

export function stripHtml(value: string): string {
  return decodeEntities(stripCdata(value))
    .replace(/<[^>]*>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/giu, (whole, entity: string) => {
    if (entity.startsWith("#")) {
      const code = entity.startsWith("#x") || entity.startsWith("#X")
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
