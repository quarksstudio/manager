import { constants, promises as fs } from 'fs';
import type { FileHandle } from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  loadNativeDirectory,
  type NativeDirectoryApi,
} from './native-directory';

const flags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;

/** Linux directory descriptors anchor every lookup instead of reusing pathname prefixes. */
export class InstallDirectory {
  private constructor(
    private readonly handle: FileHandle | unknown,
    private readonly native?: NativeDirectoryApi,
  ) {}

  static preflight(): void {
    if (process.platform !== 'linux') loadNativeDirectory();
  }

  static async open(target: string): Promise<InstallDirectory> {
    if (process.platform !== 'linux') {
      const native = loadNativeDirectory();
      const canonical = await fs.realpath(target);
      return new InstallDirectory(native.openRoot(canonical), native);
    }
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
    return `/proc/self/fd/${(this.handle as FileHandle).fd}/${name}`;
  }

  private components(relative: string): string[] {
    relative =
      process.platform === 'win32' ? relative.replace(/\\/g, '/') : relative;
    if (
      path.posix.isAbsolute(relative) ||
      relative.includes('\\') ||
      relative.includes('\0')
    )
      throw new Error(`Unsafe installation path: ${relative}`);
    const parts = relative.split('/');
    if (parts.some((part) => !part || part === '.' || part === '..'))
      throw new Error(`Unsafe installation path: ${relative}`);
    if (
      process.platform === 'win32' &&
      parts.some(
        (part) =>
          /[:<>"|?*]/.test(part) ||
          /[ .]$/.test(part) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
      )
    )
      throw new Error(`Unsafe Windows installation path: ${relative}`);
    return parts;
  }

  private async directory(
    name: string,
    create: boolean,
  ): Promise<InstallDirectory | undefined> {
    if (this.native) {
      try {
        return new InstallDirectory(
          this.native.directory(this.handle, name, create),
          this.native,
        );
      } catch (error) {
        if (!create && (error as NodeJS.ErrnoException).code === 'ENOENT')
          return undefined;
        throw error;
      }
    }
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

  private async withEntry<T>(
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

  private async withParent<T>(
    relative: string,
    create: boolean,
    action: (parent: InstallDirectory, leaf: string) => Promise<T>,
    optional = false,
  ): Promise<T | undefined> {
    const parts = this.components(relative);
    let current: InstallDirectory = this;
    try {
      for (const component of parts.slice(0, -1)) {
        const next = await current.directory(component, create);
        if (current !== this) await current.close();
        current = next ?? this;
        if (!next) {
          if (optional) return undefined;
          throw Object.assign(
            new Error(`Missing installation directory: ${relative}`),
            { code: 'ENOENT' },
          );
        }
      }
      return await action(current, parts.at(-1)!);
    } finally {
      if (current !== this) await current.close();
    }
  }
  async assertFile(relative: string): Promise<void> {
    await this.withParent(
      relative,
      false,
      async (parent, leaf) => {
        if (parent.native) parent.native.assertFile(parent.handle, leaf);
        else await assertRegularFileOrAbsent(parent.entry(leaf));
      },
      true,
    );
  }
  async readFile(relative: string): Promise<string> {
    const value = await this.withParent(
      relative,
      false,
      async (parent, leaf) => {
        if (parent.native)
          return parent.native.readFile(parent.handle, leaf).toString('utf8');
        const file = await fs.open(
          parent.entry(leaf),
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
  async writeFile(relative: string, content: string | Buffer): Promise<void> {
    await this.withParent(relative, true, async (parent, leaf) => {
      if (parent.native)
        parent.native.writeFile(parent.handle, leaf, Buffer.from(content));
      else
        await fs.writeFile(parent.entry(leaf), content, {
          flag: 'wx',
          mode: 0o600,
        });
    });
  }
  async copyFile(source: string, relative: string): Promise<void> {
    if (this.native) await this.writeFile(relative, await fs.readFile(source));
    else
      await this.withEntry(relative, true, (destination) =>
        fs.copyFile(source, destination, constants.COPYFILE_EXCL),
      );
  }
  async renameTo(
    relative: string,
    destination: InstallDirectory,
    target: string,
  ): Promise<void> {
    await this.withParent(relative, false, async (from, sourceName) => {
      await destination.withParent(target, true, async (to, targetName) => {
        await from.assertFile(sourceName);
        await to.assertFile(targetName);
        if (from.native && to.native)
          from.native.rename(from.handle, sourceName, to.handle, targetName);
        else await fs.rename(from.entry(sourceName), to.entry(targetName));
      });
    });
  }
  async removeFile(relative: string): Promise<void> {
    await this.withParent(
      relative,
      false,
      async (parent, leaf) => {
        await parent.assertFile(leaf);
        if (parent.native) {
          try {
            parent.native.remove(parent.handle, leaf, false);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
        } else await fs.rm(parent.entry(leaf), { force: true });
      },
      true,
    );
  }
  async removeEmptyDirectory(relative: string): Promise<void> {
    await this.withParent(
      relative,
      false,
      async (parent, leaf) => {
        try {
          if (parent.native) parent.native.remove(parent.handle, leaf, true);
          else await fs.rmdir(parent.entry(leaf));
        } catch (error) {
          if (
            !['ENOENT', 'ENOTEMPTY'].includes(
              (error as NodeJS.ErrnoException).code ?? '',
            )
          )
            throw error;
        }
      },
      true,
    );
  }
  async removeTree(relative: string): Promise<void> {
    if (!this.native) {
      await this.withEntry(
        relative,
        false,
        (entry) => fs.rm(entry, { recursive: true, force: true }),
        true,
      );
      return;
    }
    await this.withParent(
      relative,
      false,
      async (parent, leaf) => {
        const directory = await parent.directory(leaf, false);
        if (!directory) return;
        try {
          for (const name of directory.native!.list(directory.handle)) {
            try {
              await directory.removeFile(name);
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'EISDIR')
                throw error;
              await directory.removeTree(name);
            }
          }
        } finally {
          await directory.close();
        }
        parent.native!.remove(parent.handle, leaf, true);
      },
      true,
    );
  }
  async temporary(): Promise<{ name: string; directory: InstallDirectory }> {
    if (this.native) {
      const name = `.quark-transaction-${randomUUID()}`;
      this.native.mkdir(this.handle, name);
      const directory = await this.directory(name, false);
      if (!directory) throw new Error('Installation transaction disappeared');
      return { name, directory };
    }
    const entry = await fs.mkdtemp(this.entry('.quark-transaction-'));
    const name = path.basename(entry);
    const directory = await this.directory(name, false);
    if (!directory) throw new Error('Installation transaction disappeared');
    return { name, directory };
  }

  async close(): Promise<void> {
    if (this.native) this.native.close(this.handle);
    else await (this.handle as FileHandle).close();
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
