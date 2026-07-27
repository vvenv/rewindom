/**
 * 文字标：几何等线体手绘小写 "be water"。
 *
 * 单线（stroke）构图，与 {@link Logo} 水滴内的波纹镂空同为 monoline 语言。
 * 基线 y=131、x 高顶 y=51、上伸部顶 y=11，圆形字母半径 40。
 * 字距 32，词距 76（拉开以免小字号下 "be water" 糊成一个词）。
 * 调用方只设高度（`h-5` 等），宽度交给 `w-auto` 以保持 805:142 比例。
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      width="805"
      height="142"
      viewBox="0 0 805 142"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* b */}
        <path d="M30 11 V131" />
        <path d="M30 91 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0" />
        {/* e */}
        <path d="M222 91 A40 40 0 1 0 210 119" />
        <path d="M142 91 H222" />
        {/* w */}
        <path d="M298 51 L325 131 L353 66 L381 131 L408 51" />
        {/* a */}
        <path d="M440 91 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0" />
        <path d="M520 51 V131" />
        {/* t */}
        <path d="M574 25 V106 a25 25 0 0 0 25 25" />
        <path d="M548 51 H604" />
        {/* e */}
        <path d="M708 91 A40 40 0 1 0 696 119" />
        <path d="M628 91 H708" />
        {/* r */}
        <path d="M740 51 V131" />
        <path d="M740 84 Q740 51 775 51" />
      </g>
    </svg>
  );
}
