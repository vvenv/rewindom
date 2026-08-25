import { isSiteAssetFile } from "../../shared/site-asset.js";

/**
 * 上传前按媒体库口径分拣。
 *
 * UI 层（`FileDropArea` / `FilePickerTrigger`）已经按 `accept` 过滤过一轮，这里是
 * mutation 自己的兜底——`useUploadSiteAssets` 是公开 hook，不保证每个调用方都过了 UI。
 */
export function partitionSiteAssetFiles(files: Iterable<File>): {
  accepted: File[];
  rejected: File[];
} {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    if (isSiteAssetFile(file)) accepted.push(file);
    else rejected.push(file);
  }
  return { accepted, rejected };
}
