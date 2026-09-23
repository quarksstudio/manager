import { registryConfiguration } from '../../src/configuration';
import { uploadPackageArchive } from '../../src/infrastructure/upload-package-archive';

const input = {
  content: new Uint8Array([0, 1, 2, 3, 0]).subarray(1, 4),
  fileName: 'demo.tar.gz',
  packageName: '@scope/demo',
  version: '2.3.0',
  description: 'description',
  token: 'explicit',
};
const ticket = () => ({
  uploadId: 'upload-id',
  uploadUrl: 'https://storage.test/bundle?signature=secret',
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  method: 'PUT',
  headers: {
    'Content-Type': 'application/gzip',
    'x-goog-if-generation-match': '0',
  },
  maxSizeBytes: 50,
});
const reply = (value = ticket()) =>
  new Response(JSON.stringify(value), { status: 201 });
const status = (code: number) => new Response(null, { status: code });

describe('archive upload transport', () => {
  const previousEnv = { ...process.env };
  const previousApi = registryConfiguration.api;
  beforeEach(() => {
    registryConfiguration.api = 'https://registry.test/v1/';
  });
  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...previousEnv };
    registryConfiguration.api = previousApi;
  });
  it.each(['PUT', 'POST'])(
    'uploads exact bytes with authorized %s and no API credentials',
    async (method) => {
      process.env['MANAGER_SERVER_TOKEN'] = 'environment';
      const auth = { ...ticket(), method };
      const send = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(reply(auth))
        .mockResolvedValueOnce(status(204));
      await uploadPackageArchive(input);
      expect(send).toHaveBeenNthCalledWith(
        1,
        'https://registry.test/v1/package/%40scope%2Fdemo/2.3.0',
        {
          method: 'POST',
          headers: { Authorization: 'Bearer explicit' },
        },
      );
      expect(send).toHaveBeenNthCalledWith(2, auth.uploadUrl, {
        method,
        headers: auth.headers,
        body: new Uint8Array([1, 2, 3]).buffer,
      });
      expect(send).toHaveBeenCalledTimes(2);
    },
  );
  it.each([201, 409])(
    'creates a missing package for any initial version, tolerating creation status %s',
    async (creationStatus) => {
      const send = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(status(404))
        .mockResolvedValueOnce(status(creationStatus))
        .mockResolvedValueOnce(reply())
        .mockResolvedValueOnce(status(200));
      await uploadPackageArchive(input);
      expect(send).toHaveBeenNthCalledWith(
        2,
        'https://registry.test/v1/package/%40scope%2Fdemo',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer explicit',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ description: input.description }),
        },
      );
      expect(send.mock.calls[2][0]).toBe(send.mock.calls[0][0]);
      expect(send).toHaveBeenCalledTimes(4);
    },
  );
  it.each([401, 403, 409, 500])(
    'does not retry authorization status %s',
    async (code) => {
      const send = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(status(code));
      await expect(uploadPackageArchive(input)).rejects.toThrow(
        `Upload authorization failed (${code})`,
      );
      expect(send).toHaveBeenCalledTimes(1);
    },
  );
  it('stops when creation fails', async () => {
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(status(404))
      .mockResolvedValueOnce(status(400));
    await expect(uploadPackageArchive(input)).rejects.toThrow(
      'Package creation failed (400)',
    );
    expect(send).toHaveBeenCalledTimes(2);
  });
  it('does not loop or upload when an existing package is not accessible', async () => {
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(status(404))
      .mockResolvedValueOnce(status(409))
      .mockResolvedValueOnce(status(404));
    await expect(uploadPackageArchive(input)).rejects.toThrow(
      'Upload authorization failed (404)',
    );
    expect(send).toHaveBeenCalledTimes(3);
  });
  it.each([
    { method: 'DELETE' },
    { uploadUrl: 'invalid' },
    { uploadUrl: 'file:///tmp/bundle' },
    { headers: null },
    { headers: { invalid: 4 } },
    { expiresAt: 'invalid' },
    { expiresAt: '2000-01-01T00:00:00Z' },
    { maxSizeBytes: 0 },
    { maxSizeBytes: 2 },
  ])(
    'rejects invalid, expired or insufficient authorization: %j',
    async (override) => {
      const send = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          new Response(JSON.stringify({ ...ticket(), ...override })),
        );
      await expect(uploadPackageArchive(input)).rejects.toThrow();
      expect(send).toHaveBeenCalledTimes(1);
    },
  );
  it('rejects malformed JSON', async () => {
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('invalid'));
    await expect(uploadPackageArchive(input)).rejects.toThrow(
      'Invalid upload authorization',
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('uses the environment token if none is explicit', async () => {
    process.env['MANAGER_SERVER_TOKEN'] = 'environment';
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(reply())
      .mockResolvedValueOnce(status(200));
    await uploadPackageArchive({ ...input, token: undefined });
    expect(send.mock.calls[0][1]?.headers).toEqual({
      Authorization: 'Bearer environment',
    });
  });
  it('fails before transport for missing credentials, endpoint or empty archive', async () => {
    const send = jest.spyOn(globalThis, 'fetch');
    delete process.env['MANAGER_SERVER_TOKEN'];
    await expect(
      uploadPackageArchive({ ...input, token: undefined }),
    ).rejects.toThrow('MANAGER_SERVER_TOKEN');
    await expect(
      uploadPackageArchive({ ...input, content: new Uint8Array() }),
    ).rejects.toThrow('empty archive');
    registryConfiguration.api = '';
    await expect(uploadPackageArchive(input)).rejects.toThrow('Registry API');
    expect(send).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    'reports network failures at the correct stage (storage=%s)',
    async (storage) => {
      const send = jest.spyOn(globalThis, 'fetch');
      if (storage) send.mockResolvedValueOnce(reply());
      send.mockRejectedValue(new Error('secret signed URL or token'));
      await expect(uploadPackageArchive(input)).rejects.toThrow(
        `${storage ? 'Storage upload' : 'Upload authorization'} failed: network request failed`,
      );
      expect(send).toHaveBeenCalledTimes(storage ? 2 : 1);
    },
  );
  it('does not retry failed storage requests', async () => {
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(reply())
      .mockResolvedValueOnce(status(412));
    await expect(uploadPackageArchive(input)).rejects.toThrow(
      'Storage upload failed (412)',
    );
    expect(send).toHaveBeenCalledTimes(2);
  });
  it.each(['local', 'production'])(
    'maps only the configured emulator origin in %s',
    async (environment) => {
      process.env['QUARK_ENV'] = environment;
      process.env['LOCAL_STORAGE_PUBLIC_URL'] = 'http://localhost:4443';
      process.env['LOCAL_STORAGE_ENDPOINT'] = 'http://storage:4443';
      const url =
        'http://localhost:4443/upload/storage/v1/b/test/o?name=uploads%2Fid&uploadType=media';
      const send = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(reply({ ...ticket(), uploadUrl: url }))
        .mockResolvedValueOnce(status(200));
      await uploadPackageArchive(input);
      expect(send.mock.calls[1][0]).toBe(
        environment === 'local' ? url.replace('localhost', 'storage') : url,
      );
    },
  );
});
