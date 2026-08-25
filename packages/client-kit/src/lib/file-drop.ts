/**
 * 文件选择 / 拖放 / 粘贴的纯逻辑：`accept` 匹配、DataTransfer 取文件、体积格式化。
 *
 * 三条入口（点选、拖放、粘贴）必须共用同一份 `accept` 判定，否则会出现「文件框列得出来、
 * 拖进去被吞」这种只有用户能发现的漂移。服务端仍会按魔数再验一遍，这里只负责别让人
 * 白等一次上传。
 */

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** 人类可读的文件体积；列表里给个量级就够，不追求精确到字节。 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${SIZE_UNITS[unitIndex]}`;
}

function acceptEntries(accept: string | undefined): string[] {
  if (!accept) return [];
  return accept
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot).toLowerCase();
}

/**
 * 与 `<input accept>` 同一口径的匹配。
 *
 * MIME 与扩展名是**或**的关系：浏览器给的 `type` 时常缺失或用别名（拖 SVG 常常是空串，
 * JPEG 有 `image/jpg` / `image/pjpeg` 一堆变体），只认 MIME 会误杀。
 */
export function matchesAccept(
  file: { name: string; type: string },
  accept?: string,
): boolean {
  const entries = acceptEntries(accept);
  if (entries.length === 0) return true;

  const mime = file.type.trim().toLowerCase();
  const extension = fileExtension(file.name);

  return entries.some((entry) => {
    if (entry === "*" || entry === "*/*") return true;
    if (entry.startsWith(".")) return extension === entry;
    if (entry.endsWith("/*")) {
      return mime.length > 0 && mime.startsWith(entry.slice(0, -1));
    }
    return mime === entry;
  });
}

export function partitionByAccept(
  files: Iterable<File>,
  accept?: string,
): { accepted: File[]; rejected: File[] } {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    if (matchesAccept(file, accept)) accepted.push(file);
    else rejected.push(file);
  }
  return { accepted, rejected };
}

/** 拖进来的是不是文件（而不是选中的文字 / 页面里的元素）。 */
export function isFileDrag(data: DataTransfer | null): boolean {
  if (!data) return false;
  return Array.from(data.types).includes("Files");
}

export function filesFromDataTransfer(data: DataTransfer | null): File[] {
  if (!data) return [];
  return Array.from(data.files);
}

/**
 * 剪贴板里的文件。
 *
 * 截图直接 Ctrl+V 走的就是这里（`files` 里是一个匿名 `image.png`）；从 Excel / Word
 * 复制的内容也会顺带带一张位图，所以调用方要先看 `clipboardHasText` 决定要不要接。
 */
export function filesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  return Array.from(data.files).filter((file) => file.size > 0);
}

/** 剪贴板里同时有纯文本——多半是在复制文字，不该当成上传。 */
export function clipboardHasText(data: DataTransfer | null): boolean {
  if (!data) return false;
  return Array.from(data.types).includes("text/plain");
}

const ACCEPT_SUMMARY_LIMIT = 6;

/**
 * 把 `accept` 翻成给人看的格式清单（`JPG, PNG, SVG…`）。
 *
 * 优先用扩展名：`image/svg+xml` 这种 MIME 摆在提示里没人认得。
 */
export function summarizeAccept(accept?: string): string {
  const entries = acceptEntries(accept);
  if (entries.length === 0) return "";

  const labels: string[] = [];
  const seen = new Set<string>();
  const push = (label: string): void => {
    if (!label || seen.has(label)) return;
    seen.add(label);
    labels.push(label);
  };

  for (const entry of entries) {
    if (entry.startsWith(".")) push(entry.slice(1).toUpperCase());
  }
  if (labels.length === 0) {
    for (const entry of entries) {
      if (entry === "*" || entry === "*/*") return "";
      if (entry.endsWith("/*")) {
        push(`${entry.slice(0, -2).toUpperCase()}/*`);
        continue;
      }
      const subtype = entry.split("/")[1] ?? entry;
      push(subtype.split("+")[0]!.toUpperCase());
    }
  }

  if (labels.length > ACCEPT_SUMMARY_LIMIT) {
    return `${labels.slice(0, ACCEPT_SUMMARY_LIMIT).join(", ")}…`;
  }
  return labels.join(", ");
}
