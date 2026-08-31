import * as child_process from 'child_process';
import * as fs from 'fs';
import { resolveEntrypoint, type Manifest } from '@quark/manifest';
import { validatePermissions, type UserPolicy } from '@quark/permissions';
import { SkillExecution, type RuntimeKind } from '../domain';
import { ExecuteSkillHandler, type ProcessRunner } from '../application';

export interface ExecuteResult {
  process: child_process.ChildProcess;
  cmd: string;
  args: string[];
}

export function executeSkill(
  manifest: Manifest,
  skillPath: string,
  args: string[] = [],
  allowedEnv: Record<string, string> = {},
  policy: UserPolicy = {},
): ExecuteResult {
  const permissionResult = validatePermissions(manifest, policy);
  if (!permissionResult.granted) {
    throw new Error(
      `Runtime permissions denied: ${JSON.stringify(permissionResult.deniedPermissions)}`,
    );
  }
  const entrypoint = manifest.entrypoint;
  if (!entrypoint) {
    throw new Error('Entrypoint not defined in manifest');
  }

  const fullPath = resolveEntrypoint(manifest, skillPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Skill entrypoint file not found: ${fullPath}`);
  }

  let cmd = '';
  let cmdArgs: string[] = [];

  const runtimeKeys = Object.keys(manifest.runtime || {});

  if (runtimeKeys.includes('python')) {
    cmd = 'python3';
    cmdArgs = [fullPath, ...args];
  } else if (runtimeKeys.includes('node')) {
    cmd = 'node';
    cmdArgs = [fullPath, ...args];
  } else {
    const ext = fullPath.slice(fullPath.lastIndexOf('.'));
    if (ext === '.py') {
      cmd = 'python3';
      cmdArgs = [fullPath, ...args];
    } else if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
      cmd = 'node';
      cmdArgs = [fullPath, ...args];
    } else {
      cmd = fullPath;
      cmdArgs = args;
    }
  }

  const env = {
    PATH: process.env['PATH'] || '',
    ...allowedEnv,
  };

  const runtime: RuntimeKind =
    cmd === 'node' ? 'node' : cmd === 'python3' ? 'python' : 'native';
  const execution = new SkillExecution(runtime, fullPath, args, skillPath, env);
  const runner: ProcessRunner = {
    run: () => {
      const child = child_process.spawn(cmd, cmdArgs, {
        cwd: skillPath,
        env,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { process: child, cmd, args: cmdArgs };
    },
  };
  return new ExecuteSkillHandler(runner).execute(execution);
}
