/**
 * 租户官网 `/site.webmanifest` 的 JSON 形状。
 *
 * 按租户现场拼，不是一份静态文件：名字取 `site_name`，主题色取 `primary_color`。
 * 图标只放 maskable 那一张——favicon 自带圆角，套进 Android 遮罩会被二次裁切。
 */

import { isOpaqueHex } from "./site-color.js";

export interface SiteWebManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface SiteWebManifest {
  name: string;
  short_name: string;
  start_url: "/";
  display: "standalone";
  theme_color?: string;
  background_color: string;
  icons: SiteWebManifestIcon[];
}

export function buildSiteWebManifest(input: {
  name: string;
  theme_color?: string | null;
  background_color?: string | null;
  maskable_icon_url?: string | null;
}): SiteWebManifest {
  const name = input.name.trim() || "Site";
  const icons: SiteWebManifestIcon[] = [];
  if (input.maskable_icon_url) {
    icons.push({
      src: input.maskable_icon_url,
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    });
  }
  const manifest: SiteWebManifest = {
    name,
    short_name: name,
    start_url: "/",
    display: "standalone",
    background_color:
      input.background_color && isOpaqueHex(input.background_color)
        ? input.background_color
        : "#ffffff",
    icons,
  };
  if (input.theme_color) {
    manifest.theme_color = input.theme_color;
  }
  return manifest;
}
