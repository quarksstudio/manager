const startRegistration = jest.fn();
const startAuthentication = jest.fn();
jest.mock('@simplewebauthn/browser', () => ({
  startRegistration,
  startAuthentication,
}));
jest.mock('./lib/api-fetch', () => ({ apiFetch: jest.fn() }));

import { apiFetch } from './lib/api-fetch';
import { registerAuditorPasskey, signAuditDecision } from './auditor-webauthn';

const request = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('auditor WebAuthn client', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completes registration without exposing private key material', async () => {
    request
      .mockResolvedValueOnce({ challengeId: 'c1', options: { challenge: 'x' } })
      .mockResolvedValueOnce({ credentialId: 'key-1' });
    startRegistration.mockResolvedValue({ id: 'key-1' });

    await expect(registerAuditorPasskey('https://api.test')).resolves.toEqual({
      credentialId: 'key-1',
    });
    expect(startRegistration).toHaveBeenCalledWith({
      optionsJSON: { challenge: 'x' },
    });
  });

  it('sends the same decision fields with the signed assertion', async () => {
    request
      .mockResolvedValueOnce({ challengeId: 'c2', options: { challenge: 'y' } })
      .mockResolvedValueOnce({ status: 'aprobada' });
    startAuthentication.mockResolvedValue({ id: 'key-1' });

    await signAuditDecision(
      'https://api.test',
      { packageId: 'pkg', versionId: '1.0.0', productId: 's4' },
      { approve: true, notes: 'reviewed' },
    );
    expect(request).toHaveBeenLastCalledWith(
      'https://api.test/v1/certifications/pkg/1.0.0/s4/decision',
      expect.objectContaining({
        body: JSON.stringify({
          approve: true,
          notes: 'reviewed',
          challengeId: 'c2',
          assertion: { id: 'key-1' },
        }),
      }),
    );
  });
});
