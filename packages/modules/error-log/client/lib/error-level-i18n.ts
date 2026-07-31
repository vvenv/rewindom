import type { TFunction } from "i18next";

import { ErrorLevel, type ErrorLevelType } from "../../shared/index.js";

const ERROR_LEVEL_CODES = Object.values(ErrorLevel) as ErrorLevelType[];

export function translateErrorLevel(t: TFunction, level: string): string {
  if ((ERROR_LEVEL_CODES as readonly string[]).includes(level)) {
    return t(`levels.${level as ErrorLevelType}`);
  }
  return level;
}

export { ERROR_LEVEL_CODES };
