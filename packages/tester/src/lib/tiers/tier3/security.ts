import { spawn } from 'child_process';

import type { SecurityRunner } from '../../types';

export class CliSecurityRunner implements SecurityRunner {
  async scan(targetDir: string, timeoutMs: number): Promise<string[]> {
    const errors: string[] = [];
    const semgrep = await command(
      'semgrep',
      [
        'scan',
        '--config',
        process.env['SEMGREP_RULES_PATH'] ?? 'auto',
        '--json',
        targetDir,
      ],
      timeoutMs,
    );
    if (semgrep.code !== 0)
      errors.push(`Semgrep failed: ${semgrep.stderr || semgrep.stdout}`);
    else {
      const report = parseJson(semgrep.stdout, 'Semgrep') as {
        results?: unknown[];
      };
      if ((report.results ?? []).length)
        errors.push(
          `Semgrep found ${(report.results ?? []).length} finding(s)`,
        );
    }
    const gitleaks = await command(
      'gitleaks',
      [
        'detect',
        '--no-git',
        '--source',
        targetDir,
        '--report-format',
        'json',
        '--report-path',
        '-',
      ],
      timeoutMs,
    );
    if (gitleaks.code !== 0)
      errors.push(
        `Gitleaks found secrets or failed: ${gitleaks.stderr || gitleaks.stdout}`,
      );
    return errors;
  }
}

function command(
  executable: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false,
      env: { PATH: process.env['PATH'] ?? '', LANG: 'C' },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${executable} timed out`));
    }, timeoutMs);
    const append = (kind: 'stdout' | 'stderr', data: Buffer): void => {
      if (kind === 'stdout') stdout += data.toString();
      else stderr += data.toString();
      if (stdout.length + stderr.length > 1024 * 1024) {
        child.kill('SIGKILL');
        reject(new Error(`${executable} output exceeded 1 MiB`));
      }
    };
    child.stdout.on('data', (data: Buffer) => append('stdout', data));
    child.stderr.on('data', (data: Buffer) => append('stderr', data));
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

function parseJson(value: string, name: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} emitted invalid JSON`);
  }
}
