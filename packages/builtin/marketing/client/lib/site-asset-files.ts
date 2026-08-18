import { isSiteAssetFile } from "../../shared/site-asset.js";

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

export function filesFromDataTransfer(data: DataTransfer | null): File[] {
  if (!data) return [];
  return Array.from(data.files);
}

export function isFileDrag(data: DataTransfer | null): boolean {
  if (!data) return false;
  return Array.from(data.types).includes("Files");
}
