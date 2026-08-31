import { spawn } from 'child_process';

import type { SandboxAdapter, SandboxRequest, SandboxResult } from '../types';
import { startMockProxy } from './mock-proxy';

const MAX_OUTPUT = 1024 * 1024;

export class ProcessSandbox implements SandboxAdapter {
  readonly name = 'process';
  readonly strongNetworkIsolation = false;

  async execute(request: SandboxRequest): Promise<SandboxResult> {
    const proxy = request.httpMocks?.length
      ? await startMockProxy(request.httpMocks)
      : undefined;
    try {
      const result = await this.spawn(request, proxy?.url, proxy?.caFile);
      const proxyErrors = (await proxy?.stop()) ?? [];
      if (proxyErrors.length) throw new Error(proxyErrors.join('; '));
      return result;
    } catch (error) {
      if (proxy) await proxy.stop().catch(() => []);
      throw error;
    }
  }

  private spawn(
    request: SandboxRequest,
    proxyUrl?: string,
    caFile?: string,
  ): Promise<SandboxResult> {
    return new Promise((resolve, reject) => {
      const shell =
        process.platform === 'win32'
          ? (process.env['COMSPEC'] ?? 'cmd.exe')
          : '/bin/sh';
      const args =
        process.platform === 'win32'
          ? ['/d', '/s', '/c', request.command]
          : ['-c', `exec ${request.command}`];
      const child = spawn(shell, args, {
        cwd: request.cwd,
        shell: false,
        env: {
          PATH: process.env['PATH'] ?? '',
          LANG: 'C',
          TZ: 'UTC',
          MANAGER_ALLOW_NETWORK: String(request.allowNetwork),
          MANAGER_MOCK_TIME: request.mockTime ?? '',
          MANAGER_HTTP_MOCKS: JSON.stringify(request.httpMocks ?? []),
          MANAGER_TOOL_MOCKS: JSON.stringify(request.toolMocks ?? []),
          ...(proxyUrl
            ? {
                HTTP_PROXY: proxyUrl,
                HTTPS_PROXY: proxyUrl,
                http_proxy: proxyUrl,
                https_proxy: proxyUrl,
                NO_PROXY: '127.0.0.1,localhost',
                NODE_USE_ENV_PROXY: '1',
                NODE_EXTRA_CA_CERTS: caFile ?? '',
                REQUESTS_CA_BUNDLE: caFile ?? '',
                SSL_CERT_FILE: caFile ?? '',
              }
            : {}),
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const finish = (error?: Error, exitCode = -1): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) return reject(error);
        let envelope: {
          output?: unknown;
          events?: Array<{ tool: string; args?: unknown }>;
        };
        try {
          envelope = JSON.parse(stdout) as typeof envelope;
        } catch {
          return reject(new Error('testCommand must emit one JSON document'));
        }
        resolve({
          output: envelope.output ?? envelope,
          events: envelope.events,
          stdout,
          stderr,
          exitCode,
        });
      };
      const append = (kind: 'stdout' | 'stderr', chunk: Buffer): void => {
        if (kind === 'stdout') stdout += chunk.toString();
        else stderr += chunk.toString();
        if (stdout.length + stderr.length > MAX_OUTPUT) {
          killTree(child.pid);
          finish(new Error('testCommand output exceeded 1 MiB'));
        }
      };
      child.stdout.on('data', (chunk: Buffer) => append('stdout', chunk));
      child.stderr.on('data', (chunk: Buffer) => append('stderr', chunk));
      child.on('error', (error) => finish(error));
      child.on('close', (code) =>
        code === 0
          ? finish(undefined, code)
          : finish(new Error(`testCommand exited ${code}: ${stderr.trim()}`)),
      );
      const timer = setTimeout(() => {
        killTree(child.pid);
        finish(new Error(`testCommand timed out after ${request.timeoutMs}ms`));
      }, request.timeoutMs);
      child.stdin.write(`${JSON.stringify(request.input)}\n`);
      child.stdin.end();
    });
  }
}

function killTree(pid: number | undefined): void {
  if (!pid) return;
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already exited */
  }
}
