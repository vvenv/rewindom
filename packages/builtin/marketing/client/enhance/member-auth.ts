/**
 * 会员登录 / 注册表单的渐进增强：**只做滑块验证码**。
 *
 * 表单本身是真 `<form method="post">`，提交、跳转、错误回显全由服务端完成——没有 JS
 * 也能登录。这里唯一补的是滑块：拖动这件事没有无 JS 的等价物，所以平台开了验证码时
 * SSR 会渲一个空挂点（`[data-member-captcha]`），由本文件填出可拖的轨道，松手后把
 * 坐标写进隐藏字段 `captcha`，随表单一起 POST。
 *
 * **不**先打 `/api/captcha/verify`：挑战一次性消费，得留给服务端在 login/register 里
 * 校验（同 SPA 侧 `MemberCaptcha` 的约定）。
 */

import { pageLocale } from "./locale.js";

interface CaptchaChallenge {
  id: string;
  token: string;
  targetX: number;
  targetY: number;
}

/** 与 SPA 侧同一组常数：轨道 260px 对应挑战图 268px + 16px 起点。 */
const TRACK_WIDTH = 260;
const HANDLE_WIDTH = 40;
const IMAGE_WIDTH = 268;
const IMAGE_OFFSET = 16;
const TOLERANCE = 12;

function isEnglish(): boolean {
  return pageLocale() === "en";
}

function hintText(): string {
  return isEnglish() ? "Drag to verify" : "拖动滑块完成验证";
}

function mount(host: HTMLElement, challengePath: string): void {
  const form = host.closest("form");
  const hidden = form?.querySelector<HTMLInputElement>('input[name="captcha"]');
  if (!form || !hidden) return;

  const track = document.createElement("div");
  track.className = "member-auth-captcha-track";
  const hint = document.createElement("p");
  hint.className = "member-auth-captcha-hint";
  hint.textContent = hintText();
  const handle = document.createElement("div");
  handle.className = "member-auth-captcha-handle";
  handle.setAttribute("role", "slider");
  handle.setAttribute("aria-label", hintText());
  track.append(hint, handle);
  host.replaceChildren(track);

  let challenge: CaptchaChallenge | null = null;
  let dragging = false;
  let offset = 0;

  const load = (): void => {
    hidden.value = "";
    offset = 0;
    handle.style.transform = "translateX(0)";
    hint.textContent = hintText();
    void fetch(challengePath, { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { data?: CaptchaChallenge } | null) => {
        challenge = payload?.data ?? null;
      })
      .catch(() => {
        challenge = null;
      });
  };

  const finish = (): void => {
    if (!challenge) return;
    const x = Math.round((offset / TRACK_WIDTH) * IMAGE_WIDTH + IMAGE_OFFSET);
    const y = challenge.targetY;
    if (
      Math.abs(x - challenge.targetX) > TOLERANCE ||
      Math.abs(y - challenge.targetY) > TOLERANCE
    ) {
      // 差太远就换一张挑战：留着同一张让人反复试，等于把容差当成了可穷举的密码
      load();
      return;
    }
    hidden.value = JSON.stringify({
      id: challenge.id,
      token: challenge.token,
      x,
      y,
    });
    hint.textContent = "✓";
  };

  handle.addEventListener("pointerdown", (event) => {
    if (hidden.value) return;
    handle.setPointerCapture(event.pointerId);
    dragging = true;
  });
  handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const rect = track.getBoundingClientRect();
    offset = Math.max(
      0,
      Math.min(event.clientX - rect.left - HANDLE_WIDTH / 2, TRACK_WIDTH),
    );
    handle.style.transform = `translateX(${offset}px)`;
  });
  const release = (): void => {
    if (!dragging) return;
    dragging = false;
    finish();
  };
  handle.addEventListener("pointerup", release);
  handle.addEventListener("pointercancel", release);

  load();
}

export function enhanceMemberAuth(): void {
  for (const host of document.querySelectorAll<HTMLElement>(
    "[data-member-captcha]",
  )) {
    const path = host.getAttribute("data-member-captcha");
    if (path) mount(host, path);
  }
}
