import { loadConfig, type AppConfig } from '@quarks.studio/config';

import type {
  UploadAuthorization,
  UploadPackageArchiveInput,
} from '../application/package-archive-uploader';

export type {
  UploadAuthorization,
  UploadPackageArchiveInput,
};

function authorization(value: unknown): UploadAuthorization {
  const ticket = value as UploadAuthorization | null;
  if (
    !ticket ||
    typeof ticket.uploadId !== 'string' ||
    !ticket.uploadId ||
    typeof ticket.uploadUrl !== 'string' ||
    !['PUT', 'POST'].includes(ticket.method) ||
    !ticket.headers ||
    typeof ticket.headers !== 'object' ||
    Array.isArray(ticket.headers) ||
    !Object.values(ticket.headers).every(
      (header) => typeof header === 'string',
    ) ||
    !Number.isSafeInteger(ticket.maxSizeBytes) ||
    ticket.maxSizeBytes < 1 ||
    typeof ticket.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(ticket.expiresAt))
  )
    throw new Error('Invalid upload authorization');
  let url: URL;
  try {
    url = new URL(ticket.uploadUrl);
  } catch {
    throw new Error('Invalid upload authorization URL');
  }
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Invalid upload authorization URL');
  if (Date.parse(ticket.expiresAt) <= Date.now())
    throw new Error('Upload authorization has expired');
  return ticket;
}

function storageUrl(url: string, config: AppConfig): string {
  if (
    typeof window !== 'undefined' ||
    config.env !== 'local' ||
    !config.localStoragePublicUrl ||
    !config.localStorageEndpoint
  )
    return url;
  const target = new URL(url);
  if (target.origin !== new URL(config.localStoragePublicUrl).origin)
    return url;
  return (
    new URL(config.localStorageEndpoint).origin +
    target.pathname +
    target.search
  );
}

async function request(
  stage: string,
  url: string,
  options: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(`${stage} failed: network request failed`);
  }
}

function check(response: Response, stage: string): void {
  if (!response.ok) throw new Error(`${stage} failed (${response.status})`);
}

/** Resolve only after Storage accepts the archive; certification is asynchronous. */
export async function uploadPackageArchive(
  input: UploadPackageArchiveInput,
): Promise<void> {
  const { config } = await loadConfig();
  const token = input.token ?? config.token;
  if (!token) throw new Error('No authentication token is configured');
  if (!config.registryUrl) throw new Error('Registry API is not configured');
  if (!input.content.byteLength)
    throw new Error('Cannot upload an empty archive');
  const base = `${config.registryUrl.replace(/\/$/, '')}/package/${encodeURIComponent(input.packageName)}`;
  const authorize = () =>
    request(
      'Upload authorization',
      `${base}/${encodeURIComponent(input.version)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  let response = await authorize();
  if (response.status === 404) {
    const created = await request('Package creation', base, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description: input.description }),
    });
    if (created.status !== 409) check(created, 'Package creation');
    response = await authorize();
  }
  check(response, 'Upload authorization');
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error('Invalid upload authorization');
  }
  const ticket = authorization(value);
  if (input.content.byteLength > ticket.maxSizeBytes)
    throw new Error(
      `Archive exceeds upload limit (${ticket.maxSizeBytes} bytes)`,
    );
  const uploaded = await request(
    'Storage upload',
    storageUrl(ticket.uploadUrl, config),
    {
      method: ticket.method,
      headers: ticket.headers,
      body: new Uint8Array(input.content).buffer,
    },
  );
  check(uploaded, 'Storage upload');
}
