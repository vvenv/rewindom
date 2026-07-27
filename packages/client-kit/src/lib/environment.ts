export type SystemInfoEnvironment = "production" | "test" | "development";

export interface AppVersionInfo {
  version: string;
}

export interface SystemInfo {
  version: string;
  environment: SystemInfoEnvironment;
}

const ENVIRONMENT_LABELS: Record<SystemInfoEnvironment, string> = {
  production: "生产",
  test: "测试",
  development: "开发",
};

export function getEnvironmentLabel(
  environment: SystemInfoEnvironment,
): string {
  return ENVIRONMENT_LABELS[environment];
}
