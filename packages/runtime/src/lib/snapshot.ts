import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** Copy through pinned directory descriptors; never follow package symlinks. */
export function createExecutionSnapshot(
  source: string,
  entrypoint: string,
): { root: string; entrypoint: string; dispose(): void } {
  if (process.platform !== 'linux')
    throw new Error('Immutable execution snapshots currently require Linux');
  const canonical = fs.realpathSync(source);
  const relative = path.relative(canonical, entrypoint);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error('Entrypoint escapes snapshot');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quark-execution-'));
  let bytes = 0,
    files = 0;
  const copy = (descriptor: number, destination: string, depth: number) => {
    if (depth > 32)
      throw new Error('Execution snapshot nesting limit exceeded');
    for (const name of fs.readdirSync(`/proc/self/fd/${descriptor}`)) {
      const from = `/proc/self/fd/${descriptor}/${name}`;
      const fd = fs.openSync(
        from,
        fs.constants.O_RDONLY |
          fs.constants.O_NOFOLLOW |
          fs.constants.O_NONBLOCK,
      );
      try {
        const stat = fs.fstatSync(fd);
        const to = path.join(destination, name);
        if (stat.isDirectory()) {
          fs.mkdirSync(to, { mode: 0o700 });
          copy(fd, to, depth + 1);
          fs.chmodSync(to, 0o500);
        } else {
          if (!stat.isFile() || stat.nlink !== 1)
            throw new Error(
              'Execution snapshot rejects links and special files',
            );
          if (++files > 2000 || stat.size > 8 * 1024 * 1024)
            throw new Error('Execution snapshot file limit exceeded');
          const out = fs.openSync(to, 'wx', stat.mode & 0o111 ? 0o500 : 0o400);
          try {
            const buffer = Buffer.alloc(64 * 1024);
            let count,
              size = 0;
            while (
              (count = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0
            ) {
              size += count;
              bytes += count;
              if (size > 8 * 1024 * 1024 || bytes > 64 * 1024 * 1024)
                throw new Error('Execution snapshot byte limit exceeded');
              fs.writeSync(out, buffer, 0, count);
            }
          } finally {
            fs.closeSync(out);
          }
        }
      } finally {
        fs.closeSync(fd);
      }
    }
  };
  const dispose = () => {
    // Restore owner permissions solely for cleanup of our private snapshot.
    const writable = (dir: string) => {
      fs.chmodSync(dir, 0o700);
      for (const name of fs.readdirSync(dir)) {
        const file = path.join(dir, name);
        if (fs.lstatSync(file).isDirectory()) writable(file);
      }
    };
    if (fs.existsSync(root)) {
      writable(root);
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
  let fd: number | undefined;
  try {
    fd = fs.openSync(
      canonical,
      fs.constants.O_RDONLY |
        fs.constants.O_DIRECTORY |
        fs.constants.O_NOFOLLOW,
    );
    copy(fd, root, 0);
    fs.chmodSync(root, 0o500);
    return { root, entrypoint: path.join(root, relative), dispose };
  } catch (error) {
    dispose();
    throw error;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
