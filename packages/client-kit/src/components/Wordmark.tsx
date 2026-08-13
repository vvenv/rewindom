/**
 * 文字标：几何等线体手绘小写 "rewindom"。
 *
 * 单线（stroke）构图。基线 y=131、x 高顶 y=51、上伸部顶 y=11，圆形字母半径 40。
 * 字距 32。调用方只设高度（`h-5` 等），宽度交给 `w-auto` 以保持 910:142 比例。
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      width="910"
      height="142"
      viewBox="0 0 910 142"
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
        {/* r */}
        <path d="M30 51 V131" />
        <path d="M30 84 Q30 51 65 51" />
        {/* e */}
        <path d="M177 91 A40 40 0 1 0 165 119" />
        <path d="M97 91 H177" />
        {/* w */}
        <path d="M209 51 L236 131 L264 66 L292 131 L319 51" />
        {/* i */}
        <path d="M351 18 v0" />
        <path d="M351 51 V131" />
        {/* n */}
        <path d="M383 51 V131" />
        <path d="M383 91 A40 40 0 0 0 463 91" />
        <path d="M463 91 V131" />
        {/* d */}
        <path d="M575 11 V131" />
        <path d="M495 91 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0" />
        {/* o */}
        <path d="M607 91 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0" />
        {/* m */}
        <path d="M719 51 V131" />
        <path d="M719 91 A40 40 0 0 0 799 91" />
        <path d="M799 51 V131" />
        <path d="M799 91 A40 40 0 0 0 879 91" />
        <path d="M879 91 V131" />
      </g>
    </svg>
  );
}
