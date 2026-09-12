/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

import { useInstall } from './hooks';
import { install } from './lib/installer';
import { uninstall } from './lib/uninstaller';

jest.mock('./lib/installer', () => ({ install: jest.fn() }));
jest.mock('./lib/uninstaller', () => ({ uninstall: jest.fn() }));

const installMock = install as jest.MockedFunction<typeof install>;
const uninstallMock = uninstall as jest.MockedFunction<typeof uninstall>;

describe('useInstall', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps run stable across renders with fresh default options', () => {
    const { result, rerender } = renderHook(() =>
      useInstall({ targetInstallDir: '/target' }),
    );
    const run = result.current.run;
    rerender();
    expect(result.current.run).toBe(run);
  });

  it('runs an installation and exposes its result', async () => {
    const installed = {
      targetInstallDir: '/target',
      lockfilePath: '/target/skill.lock.yml',
      installed: ['demo@1.0.0'],
      reused: [],
      rootLocators: ['demo@1.0.0'],
      isolatedLocators: [],
    };
    installMock.mockResolvedValue(installed);
    const { result } = renderHook(() =>
      useInstall({ targetInstallDir: '/target', providers: ['openai'] }),
    );

    await act(async () => {
      await result.current.run('demo@^1.0.0', { force: true });
    });

    expect(installMock).toHaveBeenCalledWith('demo@^1.0.0', {
      targetInstallDir: '/target',
      providers: ['openai'],
      force: true,
    });
    expect(result.current.result).toEqual(installed);
    expect(result.current.installing).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('exposes errors and can reset its state', async () => {
    const failure = new Error('Install failed');
    installMock.mockRejectedValue(failure);
    const { result } = renderHook(() => useInstall());

    await act(async () => {
      await expect(result.current.run('demo')).rejects.toThrow(
        'Install failed',
      );
    });
    expect(result.current.error).toBe(failure);

    act(() => result.current.reset());
    expect(result.current.error).toBeUndefined();
    expect(result.current.result).toBeNull();
  });
});

describe('useUninstallPackage', () => {
  it('tracks uninstall progress and completion', async () => {
    uninstallMock.mockImplementation(async (_name, _target, onStep) => {
      onStep?.('locating', 10);
      onStep?.('removing-files', 45);
      onStep?.('completed', 100);
    });
    const { useUninstallPackage } = await import('./hooks');
    const { result } = renderHook(() => useUninstallPackage('/target'));

    await act(async () => result.current.uninstall('demo'));

    expect(uninstallMock).toHaveBeenCalledWith(
      'demo',
      '/target',
      expect.any(Function),
    );
    expect(result.current).toMatchObject({
      isLoading: false,
      isSuccess: true,
      isError: false,
      currentStep: 'completed',
      progressPercentage: 100,
    });
  });
});
