import { requestServerCertification } from './server-client';

describe('server certification client', () => {
  afterEach(() => jest.restoreAllMocks());

  it('asks the server to launch the container workflow', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            messageId: 'm1',
            packageId: 'pkg',
            versionId: '1.0.0',
            productId: 'tier-3',
          }),
          { status: 202, headers: { 'content-type': 'application/json' } },
        ),
      );
    const result = await requestServerCertification({
      serverUrl: 'https://api.example.test',
      packageId: 'pkg',
      versionId: '1.0.0',
      productId: 'tier-3',
      accessToken: 'secret',
    });
    expect(result.messageId).toBe('m1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/certifications/pkg/1.0.0/tier-3/run',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      }),
    );
  });

  it('rejects insecure remote server URLs', async () => {
    await expect(
      requestServerCertification({
        serverUrl: 'http://api.example.test',
        packageId: 'pkg',
        versionId: '1',
        productId: 'tier-1',
        accessToken: 'x',
      }),
    ).rejects.toThrow('must use HTTPS');
  });
});
