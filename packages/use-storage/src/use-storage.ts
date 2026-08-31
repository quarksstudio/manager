import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createStorage, type InspectableStorageEngine } from './storage';
import type { StorageMetadata, StorageOptions } from './types';

export type StorageSetter<T> = (
  value: T | ((current: T) => T),
  ttlMs?: number,
) => Promise<void>;

export function useStorage<T>(
  key: string,
  initialValue: T,
  options: StorageOptions = {},
): [T, StorageSetter<T>, () => Promise<void>, StorageMetadata] {
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(value);
  const [metadata, setMetadata] = useState<StorageMetadata>({
    isExpired: false,
    lastUpdated: null,
  });
  const storage = useMemo(
    () =>
      createStorage({
        namespace: options.namespace,
        basePath: options.basePath,
        ttl: options.ttl,
        backend: options.backend,
        browserStorage: options.browserStorage,
      }) as InspectableStorageEngine,
    [
      options.namespace,
      options.basePath,
      options.ttl,
      options.backend,
      options.browserStorage,
    ],
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const refresh = useCallback(async () => {
    const expired = await storage.isExpired(key);
    const item = await storage.getStorageItem<T>(key);
    if (item) {
      valueRef.current = item.value;
      setValue(item.value);
      setMetadata({ isExpired: false, lastUpdated: item.createdAt });
    } else {
      valueRef.current = initialValue;
      setValue(initialValue);
      setMetadata({ isExpired: expired, lastUpdated: null });
    }
  }, [initialValue, key, storage]);

  useEffect(() => {
    let active = true;
    void refresh().catch(() => {
      if (active) setMetadata({ isExpired: false, lastUpdated: null });
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const synchronize = () => void refresh();
    window.addEventListener('storage', synchronize);
    return () => window.removeEventListener('storage', synchronize);
  }, [refresh]);

  const update = useCallback<StorageSetter<T>>(
    async (next, ttlMs) => {
      const nextValue =
        typeof next === 'function'
          ? (next as (current: T) => T)(valueRef.current)
          : next;
      await storage.setItem(key, nextValue, ttlMs);
      const item = await storage.getStorageItem<T>(key);
      valueRef.current = nextValue;
      setValue(nextValue);
      setMetadata({
        isExpired: false,
        lastUpdated: item?.createdAt ?? Date.now(),
      });
    },
    [key, storage],
  );

  const remove = useCallback(async () => {
    await storage.removeItem(key);
    valueRef.current = initialValue;
    setValue(initialValue);
    setMetadata({ isExpired: false, lastUpdated: null });
  }, [initialValue, key, storage]);

  return [value, update, remove, metadata];
}
