export interface PersistStorageOptions<T> {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

export type UsePersistStateOptions<T> = PersistStorageOptions<T>;

export function readPersistedValue<T>({
  key,
  defaultValue,
  deserialize = JSON.parse,
}: PersistStorageOptions<T>): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return deserialize(item);
  } catch {
    return defaultValue;
  }
}

export function writePersistedValue<T>(
  key: string,
  value: T,
  serialize: (value: T) => string = JSON.stringify,
): void {
  try {
    localStorage.setItem(key, serialize(value));
  } catch {
    // ignore localStorage errors (e.g., quota exceeded, private browsing)
  }
}

export function removePersistedValue(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
