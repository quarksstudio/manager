import { constants, promises as fs } from 'fs';
import type { FileHandle } from 'fs/promises';
import * as path from 'path';

const flags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;

/** Linux directory descriptors anchor every lookup instead of reusing pathname prefixes. */
export class InstallDirectory {
  private constructor(private readonly handle: FileHandle) {}

  static assertSupported(): void {
    if (
      process.platform !== 'linux' ||
      !constants.O_NOFOLLOW ||
      !constants.O_DIRECTORY
    ) {
      throw new Error(
        'Secure installation requires Linux directory descriptors; no unsafe pathname fallback is available',
      );
    }
  }

  static async open(target: string): Promise<InstallDirectory> {
    InstallDirectory.assertSupported();
    // The installation root is explicitly chosen by the caller. Canonicalize
    // aliases above that boundary, then open each component without following links.
    const canonical = await fs.realpath(target);
    let current = new InstallDirectory(
      await fs.open(path.parse(canonical).root, flags),
    );
    try {
      for (const component of canonical.split(path.sep).filter(Boolean)) {
        const next = await current.directory(component, false);
        if (!next)
          throw new Error(`Installation directory disappeared: ${canonical}`);
        await current.close();
        current = next;
      }
      // Fail before any commit mutation if this host does not expose descriptor paths.
      await fs.stat(current.entry('.'));
      return current;
    } catch (error) {
      await current.close();
      throw error;
    }
  }

  private entry(name: string): string {
    return `/proc/self/fd/${this.handle.fd}/${name}`;
  }

  private components(relative: string): string[] {
    if (path.isAbsolute(relative) || relative.includes('\\'))
      throw new Error(`Unsafe installation path: ${relative}`);
    const parts = relative.split(path.sep);
    if (parts.some((part) => !part || part === '.' || part === '..'))
      throw new Error(`Unsafe installation path: ${relative}`);
    return parts;
  }

  private async directory(
    name: string,
    create: boolean,
  ): Promise<InstallDirectory | undefined> {
    const entry = this.entry(name);
    if (create) {
      try {
        await fs.mkdir(entry);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
    }
    try {
      return new InstallDirectory(await fs.open(entry, flags));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!create && code === 'ENOENT') return undefined;
      if (code === 'ELOOP' || code === 'ENOTDIR')
        throw new Error(
          `Unsafe installation directory (symlink or non-directory): ${name}`,
        );
      throw error;
    }
  }

  async withEntry<T>(
    relative: string,
    create: boolean,
    action: (entry: string) => Promise<T>,
    optionalParents = false,
  ): Promise<T | undefined> {
    const parts = this.components(relative);
    let current: InstallDirectory = this;
    try {
      for (const component of parts.slice(0, -1)) {
        const next = await current.directory(component, create);
        if (current !== this) await current.close();
        current = next ?? this;
        if (!next) {
          if (optionalParents) return undefined;
          throw new Error(`Missing installation directory: ${relative}`);
        }
      }
      return await action(current.entry(parts[parts.length - 1]));
    } finally {
      if (current !== this) await current.close();
    }
  }

  async assertFile(relative: string): Promise<void> {
    await this.withEntry(relative, false, assertRegularFileOrAbsent, true);
  }

  async readFile(relative: string): Promise<string> {
    const value = await this.withEntry(
      relative,
      false,
      async (entry) => {
        const file = await fs.open(
          entry,
          constants.O_RDONLY | constants.O_NOFOLLOW,
        );
        try {
          if (!(await file.stat()).isFile())
            throw new Error(`Unsafe installation file: ${relative}`);
          return await file.readFile('utf8');
        } finally {
          await file.close();
        }
      },
      true,
    );
    if (value === undefined)
      throw Object.assign(new Error(`Missing file: ${relative}`), {
        code: 'ENOENT',
      });
    return value;
  }

  async temporary(): Promise<{ name: string; directory: InstallDirectory }> {
    const entry = await fs.mkdtemp(this.entry('.quark-transaction-'));
    const name = path.basename(entry);
    const directory = await this.directory(name, false);
    if (!directory) throw new Error('Installation transaction disappeared');
    return { name, directory };
  }

  async close(): Promise<void> {
    await this.handle.close();
  }
}

export async function assertRegularFileOrAbsent(entry: string): Promise<void> {
  try {
    const stat = await fs.lstat(entry);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error(
        `Unsafe installation destination (not a regular file): ${entry}`,
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
