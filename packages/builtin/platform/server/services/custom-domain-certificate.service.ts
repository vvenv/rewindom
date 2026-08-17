import { resolve4, resolve6 } from "node:dns/promises";

import { AppError, ValidationError } from "@rewindom/server-kernel/lib/app-errors.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import {
  getReservedHostnames,
  hostnameFromUrl,
} from "@rewindom/server-kernel/lib/host-tenant.js";

import { getTenantById } from "./tenant-management.service.js";

const ISSUE_TIMEOUT_MS = 180_000;

export interface IssueCustomDomainCertificateResult {
  hostname: string;
  names: string[];
  slug: string;
}

export interface IssueCustomDomainCertificateDeps {
  lookupIpv4: (hostname: string) => Promise<string[]>;
  lookupIpv6: (hostname: string) => Promise<string[]>;
  issueCertificate: (names: string[]) => Promise<string[]>;
}

async function lookupIpv4(hostname: string): Promise<string[]> {
  try {
    return await resolve4(hostname);
  } catch {
    return [];
  }
}

async function lookupIpv6(hostname: string): Promise<string[]> {
  try {
    return await resolve6(hostname);
  } catch {
    return [];
  }
}

function ipsOverlap(
  left: { v4: string[]; v6: string[] },
  right: { v4: string[]; v6: string[] },
): boolean {
  return (
    left.v4.some((ip) => right.v4.includes(ip)) ||
    left.v6.some((ip) => right.v6.includes(ip))
  );
}

async function lookupBoth(
  hostname: string,
  deps: IssueCustomDomainCertificateDeps,
): Promise<{ v4: string[]; v6: string[] }> {
  const [v4, v6] = await Promise.all([
    deps.lookupIpv4(hostname),
    deps.lookupIpv6(hostname),
  ]);
  return { v4, v6 };
}

export async function callAcmeHelper(
  names: string[],
  url = config.tenant.acmeHelperUrl,
  token = config.tenant.acmeHelperToken,
): Promise<string[]> {
  const endpoint = `${url.replace(/\/$/u, "")}/issue`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ names }),
    signal: AbortSignal.timeout(ISSUE_TIMEOUT_MS),
  });
  let payload: { ok?: boolean; names?: unknown; error?: unknown } = {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    payload = {};
  }
  const issued = Array.isArray(payload.names)
    ? payload.names.filter((name): name is string => typeof name === "string")
    : [];
  if (!response.ok || payload.ok !== true) {
    const detail =
      typeof payload.error === "string" && payload.error.trim().length > 0
        ? payload.error.trim()
        : `HTTP ${response.status}`;
    throw new AppError({
      code: "platform.acme_issue_failed",
      status: 502,
      params: { detail: detail.slice(0, 500) },
    });
  }
  return issued.length > 0 ? issued : names;
}

function defaultDeps(): IssueCustomDomainCertificateDeps {
  return {
    lookupIpv4,
    lookupIpv6,
    issueCertificate: (names) => callAcmeHelper(names),
  };
}

export async function issueCustomDomainCertificate(
  tenantId: string,
  deps: IssueCustomDomainCertificateDeps = defaultDeps(),
): Promise<IssueCustomDomainCertificateResult> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new AppError({ code: "tenant.not_found", status: 404 });
  }
  const hostname = tenant.custom_domain?.trim().toLowerCase() ?? "";
  if (!hostname) {
    throw new ValidationError("tenant.custom_domain_required");
  }
  if (getReservedHostnames().has(hostname)) {
    throw new ValidationError("tenant.domain_reserved");
  }

  const helperUrl = config.tenant.acmeHelperUrl.trim();
  const helperToken = config.tenant.acmeHelperToken.trim();
  if (!helperUrl || !helperToken) {
    throw new AppError({
      code: "platform.acme_helper_unconfigured",
      status: 503,
    });
  }

  const platformHost = hostnameFromUrl(config.frontend.url);
  if (!platformHost) {
    throw new AppError({
      code: "platform.acme_platform_host_unresolved",
      status: 500,
    });
  }

  const [platformIps, hostnameIps] = await Promise.all([
    lookupBoth(platformHost, deps),
    lookupBoth(hostname, deps),
  ]);
  if (platformIps.v4.length === 0 && platformIps.v6.length === 0) {
    throw new AppError({
      code: "platform.acme_platform_host_unresolved",
      status: 500,
    });
  }
  if (!ipsOverlap(platformIps, hostnameIps)) {
    throw new ValidationError("platform.acme_dns_mismatch", { hostname });
  }

  const names = [hostname];
  const wwwHost = hostname.startsWith("www.") ? null : `www.${hostname}`;
  if (wwwHost) {
    const wwwIps = await lookupBoth(wwwHost, deps);
    if (ipsOverlap(platformIps, wwwIps)) {
      names.push(wwwHost);
    }
  }

  const issued = await deps.issueCertificate(names);
  return { hostname, names: issued, slug: tenant.slug };
}
