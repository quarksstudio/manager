import type { ServerCertificationLaunch, ServerCertificationOptions, ServerCertificationResult } from './types';

const terminalStatuses = new Set(['approved', 'rejected', 'failed', 'aprobada', 'rechazada', 'fallida', 'en-auditoria']);

export async function requestServerCertification(options: ServerCertificationOptions): Promise<ServerCertificationResult> {
  const base = options.serverUrl.replace(/\/$/, '');
  if (!base.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error('serverUrl must use HTTPS outside localhost');
  const resource = [options.packageId, options.versionId, options.productId].map(encodeURIComponent).join('/');
  const launch = await json<ServerCertificationLaunch>(`${base}/v1/certifications/${resource}/run`, options.accessToken, { method: 'POST', signal: options.signal });
  if (!options.wait) return launch;
  const timeoutMs = options.timeoutMs ?? 30 * 60_000;
  const intervalMs = options.pollIntervalMs ?? 2000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await delay(intervalMs, options.signal);
    const certification = await json<Record<string, unknown>>(`${base}/v1/certifications/${resource}`, options.accessToken, { signal: options.signal });
    if (terminalStatuses.has(String(certification['status'] ?? '').toLowerCase())) return { ...launch, certification };
  }
  throw new Error(`Server certification timed out after ${timeoutMs}ms`);
}

async function json<T>(url: string, token: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...init.headers } });
  if (!response.ok) throw new Error(`Certification server returned ${response.status}`);
  return response.json() as Promise<T>;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error('Aborted'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason ?? new Error('Aborted')); }, { once: true });
  });
}
