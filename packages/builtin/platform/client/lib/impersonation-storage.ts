import {
  readPersistedValue,
  removePersistedValue,
  writePersistedValue,
} from "@rewindom/client-kit";
import { STORAGE_PREFIX } from "@rewindom/shared";

const IMPERSONATION_META_KEY = `${STORAGE_PREFIX}_impersonation_meta`;
const IMPERSONATION_LAST_USER_KEY = `${STORAGE_PREFIX}_impersonation_last_user`;

export interface ImpersonationMeta {
  tenant_slug: string;
  tenant_name: string;
  login_identifier: string;
}

const jsonSerialize = (value: unknown) => JSON.stringify(value);
const jsonDeserialize = <T>(value: string) => JSON.parse(value) as T;

/** 仅存 UI 元数据；平台会话备份在 HttpOnly return cookie。 */
export function saveImpersonationMeta(meta: ImpersonationMeta): void {
  writePersistedValue(IMPERSONATION_META_KEY, meta, jsonSerialize);
}

export function readImpersonationMeta(): ImpersonationMeta | null {
  return readPersistedValue<ImpersonationMeta | null>({
    key: IMPERSONATION_META_KEY,
    defaultValue: null,
    deserialize: jsonDeserialize,
  });
}

export function clearImpersonationMeta(): void {
  removePersistedValue(IMPERSONATION_META_KEY);
}

export function hasImpersonationMeta(): boolean {
  return readImpersonationMeta() !== null;
}

type LastUserByTenant = Record<string, string>;

export function readImpersonationLastUserId(tenantId: string): string | null {
  const map = readPersistedValue<LastUserByTenant>({
    key: IMPERSONATION_LAST_USER_KEY,
    defaultValue: {},
    deserialize: jsonDeserialize,
  });
  return map[tenantId] ?? null;
}

export function saveImpersonationLastUserId(
  tenantId: string,
  userId: string,
): void {
  const map = readPersistedValue<LastUserByTenant>({
    key: IMPERSONATION_LAST_USER_KEY,
    defaultValue: {},
    deserialize: jsonDeserialize,
  });
  writePersistedValue(
    IMPERSONATION_LAST_USER_KEY,
    { ...map, [tenantId]: userId },
    jsonSerialize,
  );
}
