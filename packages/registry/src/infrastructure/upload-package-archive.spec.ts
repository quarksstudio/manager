import { registryConfiguration } from '../configuration';
import {
  uploadPackageArchive,
  type UploadPackageArchiveInput,
} from './upload-package-archive';

const input: UploadPackageArchiveInput = {
  content: new Uint8Array([1, 2, 3]),
  fileName: 'demo.tgz',
  packageName: '@scope/demo',
  version: '1.0.0',
  description: 'description',
  token: 'explicit',
};

describe('archive upload transport', () => {
  const previousToken = process.env['MANAGER_SERVER_TOKEN'];
  const previousApi = registryConfiguration.api;
  beforeEach(() => {
    registryConfiguration.api = 'https://registry.test/v1/';
  });
  afterEach(() => {
    jest.restoreAllMocks();
    registryConfiguration.api = previousApi;
    if (previousToken === undefined) delete process.env['MANAGER_SERVER_TOKEN'];
    else process.env['MANAGER_SERVER_TOKEN'] = previousToken;
  });
  it('sends multipart content and prefers an explicit token', async () => {
    process.env['MANAGER_SERVER_TOKEN'] = 'environment';
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 201 }));
    await uploadPackageArchive(input);
    expect(send).toHaveBeenCalledWith(
      'https://registry.test/v1/package/%40scope%2Fdemo/1.0.0',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer explicit' },
      }),
    );
    const body = send.mock.calls[0][1]?.body as FormData;
    expect(body.get('description')).toBe('description');
    const file = body.get('file') as File;
    expect(file.name).toBe('demo.tgz');
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(input.content);
  });
  it('falls back to package creation only for a 404 on version 1.0.0', async () => {
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    await uploadPackageArchive(input);
    expect(send.mock.calls.map(([url]) => url)).toEqual([
      'https://registry.test/v1/package/%40scope%2Fdemo/1.0.0',
      'https://registry.test/v1/package/%40scope%2Fdemo',
    ]);
  });
  it.each([
    { status: 404, version: '2.0.0' },
    { status: 500, version: '1.0.0' },
    { status: 401, version: '1.0.0' },
  ])('does not retry $status for $version', async ({ status, version }) => {
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('failed', { status }));
    await expect(uploadPackageArchive({ ...input, version })).rejects.toThrow(
      `Package upload failed (${status}): failed`,
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('uses the environment token when none is explicit', async () => {
    process.env['MANAGER_SERVER_TOKEN'] = 'environment';
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 201 }));
    await uploadPackageArchive({ ...input, token: undefined });
    expect(send.mock.calls[0][1]?.headers).toEqual({
      Authorization: 'Bearer environment',
    });
  });
  it('fails before transport if credentials or endpoint are absent', async () => {
    delete process.env['MANAGER_SERVER_TOKEN'];
    const send = jest.spyOn(globalThis, 'fetch');
    await expect(
      uploadPackageArchive({ ...input, token: undefined }),
    ).rejects.toThrow('MANAGER_SERVER_TOKEN');
    registryConfiguration.api = '';
    await expect(uploadPackageArchive(input)).rejects.toThrow('Registry API');
    expect(send).not.toHaveBeenCalled();
  });
  it('propagates a network failure', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(uploadPackageArchive(input)).rejects.toThrow('offline');
  });
});
