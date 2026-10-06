import { spawn } from 'child_process';
import { realpathSync, statSync } from 'fs';
import type { PermissionEnforcingHost, RunningProcess } from '../application';
import type { SkillExecution } from '../domain';

/** A trusted, prebuilt single-thread launcher installs Landlock + seccomp before Node. */
export class LinuxPermissionHost implements PermissionEnforcingHost {
  private readonly launcher: string;
  constructor(launcher: string) {
    this.launcher = realpathSync(launcher);
    const stat = statSync(this.launcher);
    if (!stat.isFile() || (stat.mode & 0o022) !== 0)
      throw new Error(
        'Sandbox launcher must be a trusted, non-writable executable',
      );
  }
  run(execution: SkillExecution): RunningProcess {
    if (process.platform !== 'linux' || execution.runtime !== 'node')
      throw new Error('Restricted host supports Node on Linux only');
    if (
      execution.permissions.filesystem ||
      execution.permissions.network.length ||
      execution.permissions.tools.length
    )
      throw new Error(
        'This host only supports read-only package files with no network or subprocess permissions',
      );
    const env = { ...execution.env };
    for (const name of Object.keys(env)) {
      if (/^(NODE_|LD_|DYLD_)/.test(name)) delete env[name];
    }
    const args = [
      realpathSync(process.execPath),
      execution.cwd,
      execution.entrypoint,
      ...execution.args,
    ];
    const child = spawn(this.launcher, args, {
      cwd: execution.cwd,
      env,
      shell: false,
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let bytes = 0;
    const stop = () => {
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          child.kill('SIGKILL');
        }
      }
    };
    const timer = setTimeout(stop, 35_000);
    timer.unref();
    for (const output of [child.stdout, child.stderr])
      output.on('data', (chunk: Buffer) => {
        bytes += chunk.byteLength;
        if (bytes > 1024 * 1024) stop();
      });
    child.once('close', () => clearTimeout(timer));
    child.once('error', () => clearTimeout(timer));
    return { process: child, cmd: this.launcher, args };
  }
}
