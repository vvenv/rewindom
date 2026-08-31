export const THING_SLUG_MAX_LENGTH = 80;

const SLUG_RE = /^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u;

/** 从名字或正文收成公开路径上的一段。空串表示「请服务端自己起」。 */
export function slugifyThing(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[/#?&=]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, THING_SLUG_MAX_LENGTH);
  return s;
}

export function isThingSlug(value: string): boolean {
  return value.length > 0 && value.length <= THING_SLUG_MAX_LENGTH && SLUG_RE.test(value);
}
