import { createExecutionSnapshot } from './snapshot';
import * as child_process from 'child_process';
import * as fs from 'fs';
import { resolveEntrypoint, type Manifest } from '@quarks.studio/manifest';
import {
  validatePermissions,
  type UserPolicy,
  type PermissionRequest,
} from '@quarks.studio/permissions';
import { SkillExecution, type RuntimeKind } from '../domain';
import {
  ExecuteSkillHandler,
  type ProcessRunner,
  type PermissionEnforcingHost,
} from '../application';

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
  host?: PermissionEnforcingHost,
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

  let fullPath = resolveEntrypoint(manifest, skillPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Skill entrypoint file not found: ${fullPath}`);
  }

  const permissions: Readonly<PermissionRequest> = Object.freeze({
    filesystem: manifest.permissions?.filesystem === true,
    network: Object.freeze([...(manifest.permissions?.network ?? [])]),
    tools: Object.freeze([...(manifest.permissions?.tools ?? [])]),
  });
  const unrestricted =
    permissions.filesystem &&
    permissions.network.includes('*') &&
    permissions.tools.includes('*') &&
    policy.allowFilesystem === true &&
    policy.allowedDomains?.includes('*') &&
    policy.allowedTools?.includes('*');
  if (host && typeof host.run !== 'function')
    throw new Error('Invalid permission-enforcing host');
  if (!unrestricted && !host) {
    throw new Error(
      'Restricted execution requires a permission-enforcing host; the local process adapter cannot enforce filesystem, network or tool restrictions',
    );
  }

  const snapshot = createExecutionSnapshot(skillPath, fullPath);
  if (snapshot) {
    skillPath = snapshot.root;
    fullPath = snapshot.entrypoint;
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
  const execution = new SkillExecution(
    runtime,
    fullPath,
    Object.freeze([...args]),
    skillPath,
    Object.freeze(env),
    permissions,
  );
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
  try {
    const result = new ExecuteSkillHandler(host ?? runner).execute(execution);
    if (snapshot) {
      let disposed = false;
      const cleanup = () => {
        if (!disposed) {
          disposed = true;
          snapshot.dispose();
        }
      };
      result.process.once('close', cleanup);
      result.process.once('error', cleanup);
    }
    return result;
  } catch (error) {
    snapshot?.dispose();
    throw error;
  }
}
