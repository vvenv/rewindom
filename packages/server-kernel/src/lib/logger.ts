import pino from "pino";

import { config } from "./config.js";

const rootLogger = pino({
  level: config.server.logLevel ?? "info",
});

export function createModuleLogger(module: string): pino.Logger {
  return rootLogger.child({ module });
}
