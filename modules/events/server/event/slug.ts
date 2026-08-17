/** 事件 slug：详情页 URL 与人读标识。唯一性由调用方拼后缀保证，这里只管可读。 */

const MAX_SLUG_LENGTH = 60;
const FALLBACK_SLUG = "event";

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    // 去掉组合用变音符号，让 "Café" 变成 "cafe" 而不是 "caf"
    .replace(/[̀-ͯ]/gu, "")
    .replace(/[^a-z0-9一-鿿]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/gu, "");

  return slug.length > 0 ? slug : FALLBACK_SLUG;
}

/** 拼上短后缀避免撞车；后缀取自事件 id，不引入随机性，重跑同一条数据结果一致。 */
export function buildEventSlug(title: string, id: string): string {
  return `${slugifyTitle(title)}-${id.replace(/-/gu, "").slice(0, 6)}`;
}
