import { config } from "./config.js";

export function getAppEnvironment(): "production" | "test" | "development" {
  if (config.server.isProduction) return "production";
  if (config.server.isTest) return "test";
  return "development";
}
