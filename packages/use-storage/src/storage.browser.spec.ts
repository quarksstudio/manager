/** @jest-environment jsdom */

import { createStorage } from './storage';
import type { WebStorage } from './types';

describe('browser storage', () => {
  beforeEach(() => localStorage.clear());

  it('persists namespaced JSON in localStorage', async () => {
    const storage = createStorage({ namespace: 'quark' });
    await storage.setItem('catalog', { packages: 2 });

    expect(localStorage.getItem('quark:catalog')).not.toBeNull();
    await expect(storage.getItem('catalog')).resolves.toEqual({ packages: 2 });
  });

  it('removes malformed serialized entries safely', async () => {
    localStorage.setItem('app:broken', '{bad-json');
    const storage = createStorage({ backend: 'browser' });

    await expect(storage.getItem('broken')).resolves.toBeNull();
    expect(localStorage.getItem('app:broken')).toBeNull();
  });

  it('falls back to memory when localStorage throws quota errors', async () => {
    const unavailable: WebStorage = {
      length: 0,
      clear: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
      getItem: () => {
        throw new DOMException('Denied', 'SecurityError');
      },
      key: () => null,
      removeItem: () => {
        throw new DOMException('Denied', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
    };
    const storage = createStorage({
      backend: 'browser',
      browserStorage: unavailable,
    });

    await storage.setItem('cached', 'memory');
    await expect(storage.getItem('cached')).resolves.toBe('memory');
    await storage.removeItem('cached');
    await expect(storage.hasItem('cached')).resolves.toBe(false);
  });

  it('works without window when the browser backend is explicitly selected', async () => {
    const originalWindow = global.window;
    Reflect.deleteProperty(global, 'window');
    try {
      const storage = createStorage({ backend: 'browser' });
      await storage.setItem('ssr', true);
      await expect(storage.getItem('ssr')).resolves.toBe(true);
    } finally {
      global.window = originalWindow;
    }
  });
});
