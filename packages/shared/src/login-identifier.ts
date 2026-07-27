import { DEFAULT_TENANT_SLUG } from "./tenant-defaults.js";

export class InvalidLoginIdentifierError extends Error {
  constructor(message = "账号格式无效") {
    super(message);
    this.name = "InvalidLoginIdentifierError";
  }
}

export interface ParsedLoginIdentifier {
  username: string;
  tenant_slug: string;
}

export function formatLoginIdentifier(
  username: string,
  tenant_slug: string,
): string {
  return `${username}@${tenant_slug}`;
}

export function parseLoginIdentifier(input: string): ParsedLoginIdentifier {
  const trimmed = input.trim();
  if (!trimmed) {
    return { username: "", tenant_slug: DEFAULT_TENANT_SLUG };
  }

  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) {
    return { username: trimmed, tenant_slug: DEFAULT_TENANT_SLUG };
  }

  const username = trimmed.slice(0, atIndex);
  const tenant_slug = trimmed.slice(atIndex + 1).toLowerCase();

  if (!username || !tenant_slug) {
    throw new InvalidLoginIdentifierError();
  }

  return { username, tenant_slug };
}
