/**
 * 平台页只把**会让封禁失真或把人锁在门外**的情况做成告警。
 * 健康时一行摘要就够，不要常驻一张「一切正常」卡片。
 */
export type IpAccessAlertKind =
  | "disabled"
  | "proxy_misconfig"
  | "always_allow_empty"
  | "pending_auto";

export interface IpAccessAlertInput {
  enabled: boolean;
  always_allow: readonly string[];
  proxy_misconfig: { count: number };
  pending_auto_rules: number;
}

export function collectIpAccessAlerts(
  status: IpAccessAlertInput,
): IpAccessAlertKind[] {
  const alerts: IpAccessAlertKind[] = [];
  if (!status.enabled) alerts.push("disabled");
  if (status.proxy_misconfig.count > 0) alerts.push("proxy_misconfig");
  if (status.always_allow.length === 0) alerts.push("always_allow_empty");
  if (status.pending_auto_rules > 0) alerts.push("pending_auto");
  return alerts;
}
