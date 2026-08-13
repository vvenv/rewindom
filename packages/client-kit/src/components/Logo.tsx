/**
 * 品牌标识：厚壁圆环顶开一条径向缝（玉玦）。
 *
 * 单形、实心、重心在下。与 public/favicon.svg 保持同一几何。
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
      <path
        fill="currentColor"
        d="M87.54 27.86A108 108 0 1 0 168.46 27.86L142.24 92.77A38 38 0 1 1 113.76 92.77Z"
      />
    </svg>
  );
}
