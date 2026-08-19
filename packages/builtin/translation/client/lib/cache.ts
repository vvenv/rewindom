/**
 * 译文缓存：`sessionStorage`，随标签页关闭而消失。
 *
 * 刻意**不用 localStorage**——译文不是资产，长期留在访客机器上只会在引擎或
 * 术语表改过之后拿旧结果糊人。同一次浏览里翻过的段落不重复调用，够了。
 */

const PREFIX = "rw-tr:";
/** 超过这个条数就整表清空重来：sessionStorage 写满会抛 QuotaExceeded。 */
const MAX_ENTRIES = 800;

function storage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    // Safari 无痕模式访问 sessionStorage 会抛
    return null;
  }
}

/** 短哈希（FNV-1a）。碰撞代价只是一段译文串味，不值得引入依赖。 */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function keyOf(engine: string, target: string, text: string): string {
  return `${PREFIX}${engine}:${target}:${hash(text)}`;
}

export function readCached(
  engine: string,
  target: string,
  text: string,
): string | null {
  return storage()?.getItem(keyOf(engine, target, text)) ?? null;
}

export function writeCached(
  engine: string,
  target: string,
  text: string,
  translated: string,
): void {
  const store = storage();
  if (!store) return;
  try {
    if (store.length > MAX_ENTRIES) clearCache();
    store.setItem(keyOf(engine, target, text), translated);
  } catch {
    // 写不进去就算了，缓存是优化不是功能
  }
}

export function clearCache(): void {
  const store = storage();
  if (!store) return;
  const doomed: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (key?.startsWith(PREFIX)) doomed.push(key);
  }
  for (const key of doomed) store.removeItem(key);
}
