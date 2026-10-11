import * as path from 'path';
export interface NativeDirectoryApi {
  openRoot(path: string): unknown;
  directory(parent: unknown, name: string, create: boolean): unknown;
  mkdir(parent: unknown, name: string): void;
  assertFile(parent: unknown, name: string): void;
  readFile(parent: unknown, name: string): Buffer;
  writeFile(parent: unknown, name: string, data: Buffer): void;
  rename(from: unknown, source: string, to: unknown, destination: string): void;
  remove(parent: unknown, name: string, directory: boolean): void;
  list(directory: unknown): string[];
  close(directory: unknown): void;
}
let cached: { platform: string; api: NativeDirectoryApi } | undefined;
export function loadNativeDirectory(): NativeDirectoryApi {
  const platform = `${process.platform}-${process.arch}`;
  if (cached?.platform === platform) return cached.api;
  try {
    const api = require(
      path.join(__dirname, '../../prebuilds', platform, 'directory.node'),
    ) as NativeDirectoryApi;
    for (const method of [
      'openRoot',
      'directory',
      'mkdir',
      'assertFile',
      'readFile',
      'writeFile',
      'rename',
      'remove',
      'list',
      'close',
    ] as const)
      if (typeof api[method] !== 'function')
        throw new Error(`Missing native operation: ${method}`);
    cached = { platform, api };
    return api;
  } catch (cause) {
    throw new Error(
      `Native installer backend unavailable for ${platform}; reinstall the package with its prebuilt binaries`,
      // ToDo: { cause },
    );
  }
}
