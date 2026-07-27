/**
 * 品牌标识：圆器盛水，水面为太极 S 曲线。
 *
 * 取自李小龙「Be water, my friend」——水倒进杯子就成为杯子。
 * 外环是「器」，内里的水满至器壁、与器融为一体，即「水随器形」；
 * 水面用太极 S 而非平线，兼表「能流亦能击」的刚柔两面。
 *
 * 水的半径 88 = 外环内壁半径（98 - 20/2），二者刻意相接：留缝会在 16px
 * 下糊成一圈噪点，且「水未成器」与寓意相悖。与 public/favicon.svg 保持同一几何。
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
        d="M40 128 A44 44 0 0 1 128 128 A44 44 0 0 0 216 128 A88 88 0 0 1 40 128 Z"
      />
    </svg>
  );
}
