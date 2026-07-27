import { useEffect, useState } from "react";

import {
  readPersistedValue,
  writePersistedValue,
  type UsePersistStateOptions,
} from "../lib/persist-storage.js";

export type { UsePersistStateOptions } from "../lib/persist-storage.js";

export function usePersistState<T>({
  key,
  defaultValue,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
}: UsePersistStateOptions<T>) {
  const [state, setState] = useState<T>(() =>
    readPersistedValue({ key, defaultValue, deserialize }),
  );

  useEffect(() => {
    writePersistedValue(key, state, serialize);
  }, [key, state, serialize]);

  return [state, setState] as const;
}
