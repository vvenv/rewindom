import { useTheme } from "next-themes";

export const COLOR_MODES = ["light", "dark", "system"] as const;

export type ColorMode = (typeof COLOR_MODES)[number];

export interface ColorModeValue {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
}

function isColorMode(value: unknown): value is ColorMode {
  return (
    typeof value === "string" &&
    (COLOR_MODES as readonly string[]).includes(value)
  );
}

/** 明暗轴（light / dark / system），封装 next-themes，供账户菜单等复用。 */
export function useColorMode(): ColorModeValue {
  const { theme, setTheme } = useTheme();
  return {
    colorMode: isColorMode(theme) ? theme : "system",
    setColorMode: (mode) => setTheme(mode),
  };
}
