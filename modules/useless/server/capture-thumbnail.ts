/**
 * 用无头浏览器给一件可交互物截一张 4:3 的透明 PNG。
 *
 * 只在 seed 这条路上用，不进 Fastify 请求路径——生产镜像没有 Chromium，
 * 请求里启动浏览器会把保存接口拖垮。
 */
import type { Browser } from "playwright";

import {
  THUMBNAIL_PUMP_FRAMES,
  THUMBNAIL_VIEWPORT,
  buildUselessThumbnailDocument,
} from "./thumbnail-page.js";

export interface EmbedThumbnailShot {
  title: string;
  html: string;
}

async function launchChromium(): Promise<Browser | null> {
  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    return null;
  }

  try {
    return await playwright.chromium.launch({
      channel: "chrome",
      headless: true,
    });
  } catch {
    try {
      return await playwright.chromium.launch({ headless: true });
    } catch {
      return null;
    }
  }
}

export async function captureEmbedThumbnails(
  items: readonly EmbedThumbnailShot[],
): Promise<Map<string, Buffer>> {
  const out = new Map<string, Buffer>();
  if (items.length === 0) return out;

  const browser = await launchChromium();
  if (!browser) {
    console.warn(
      "[useless] 没有 Chromium，跳过缩略图。装好后重跑 seed：pnpm --filter @rewindom/useless exec playwright install chromium",
    );
    return out;
  }

  try {
    const page = await browser.newPage({ viewport: THUMBNAIL_VIEWPORT });
    try {
      for (const item of items) {
        try {
          await page.setContent(
            buildUselessThumbnailDocument(item.html, { pump: "always" }),
            { waitUntil: "domcontentloaded" },
          );
          await page.waitForFunction("typeof window.__pump === 'function'");
          await page.evaluate(`window.__pump(${THUMBNAIL_PUMP_FRAMES})`);
          const buffer = await page.locator(".useless-thing").screenshot({
            type: "png",
            omitBackground: true,
          });
          out.set(item.title, buffer);
        } catch (error) {
          console.warn(`[useless] 截图失败「${item.title}」`, error);
        }
      }
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }

  return out;
}
