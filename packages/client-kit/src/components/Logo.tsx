/**
 * 品牌标识：外环 + 内里回放箭头（rewind）。
 *
 * 外环与旧版同几何（r=98 / stroke 20），内里换成 Material replay 形的回放箭头，
 * 落在环的内接圆里，16px 下仍能读成「圆里有箭头」。与 public/favicon.svg 保持同一几何。
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      width="256"
      height="256"
      viewBox="0 0 256 256"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="128"
        cy="128"
        r="98"
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
      />
      <path
        fill="currentColor"
        transform="translate(40 40) scale(7.333333)"
        d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
      />
    </svg>
  );
}
