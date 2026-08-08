import {
  readPersistedValue,
  removePersistedValue,
  writePersistedValue,
} from "@be-water/client-kit";
import { STORAGE_PREFIX, type AuthTokens } from "@be-water/shared";

const IMPERSONATION_BACKUP_KEY = `${STORAGE_PREFIX}_impersonation_backup`;
const IMPERSONATION_META_KEY = `${STORAGE_PREFIX}_impersonation_meta`;
const IMPERSONATION_LAST_USER_KEY = `${STORAGE_PREFIX}_impersonation_last_user`;

export interface ImpersonationMeta {
  tenant_slug: string;
  tenant_name: string;
  login_identifier: string;
}

interface ImpersonationBackup {
  accessToken: string;
  refreshToken: string;
}

const jsonSerialize = (value: unknown) => JSON.stringify(value);
const jsonDeserialize = <T>(value: string) => JSON.parse(value) as T;

export function saveImpersonationBackup(
  tokens: AuthTokens,
  meta: ImpersonationMeta,
): void {
  writePersistedValue<ImpersonationBackup>(
    IMPERSONATION_BACKUP_KEY,
    {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
    jsonSerialize,
  );
  writePersistedValue(IMPERSONATION_META_KEY, meta, jsonSerialize);
}

export function readImpersonationBackup(): AuthTokens | null {
  const backup = readPersistedValue<ImpersonationBackup | null>({
    key: IMPERSONATION_BACKUP_KEY,
    defaultValue: null,
    deserialize: jsonDeserialize,
  });
  if (!backup) return null;
  return {
    accessToken: backup.accessToken,
    refreshToken: backup.refreshToken,
  };
}

export function readImpersonationMeta(): ImpersonationMeta | null {
  return readPersistedValue<ImpersonationMeta | null>({
    key: IMPERSONATION_META_KEY,
    defaultValue: null,
    deserialize: jsonDeserialize,
  });
}

export function clearImpersonationBackup(): void {
  removePersistedValue(IMPERSONATION_BACKUP_KEY);
  removePersistedValue(IMPERSONATION_META_KEY);
}

export function hasImpersonationBackup(): boolean {
  return readImpersonationBackup() !== null;
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
