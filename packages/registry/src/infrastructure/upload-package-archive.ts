import { registryConfiguration } from '../configuration';

export { configureRegistry } from '../configuration';

export interface UploadPackageArchiveInput {
  content: Uint8Array;
  fileName: string;
  packageName: string;
  version: string;
  description: string;
  token?: string;
}

/** Upload transport only: callers own reading and preparing the archive. */
export async function uploadPackageArchive(
  input: UploadPackageArchiveInput,
): Promise<void> {
  const token = input.token ?? process.env['MANAGER_SERVER_TOKEN'];
  if (!token) throw new Error('MANAGER_SERVER_TOKEN is not configured');
  if (!registryConfiguration.api)
    throw new Error('Registry API is not configured');
  const base = `${registryConfiguration.api.replace(/\/$/, '')}/package/${encodeURIComponent(input.packageName)}`;
  const send = (url: string) => {
    const body = new FormData();
    body.append(
      'file',
      new Blob([new Uint8Array(input.content).buffer]),
      input.fileName,
    );
    body.append('description', input.description);
    return fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
  };
  let response = await send(`${base}/${encodeURIComponent(input.version)}`);
  if (response.status === 404 && input.version === '1.0.0')
    response = await send(base);
  if (!response.ok)
    throw new Error(
      `Package upload failed (${response.status}): ${await response.text()}`,
    );
}
