import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

import { createAuditCertification } from '../../src/index';
import {
  createHttpCertificationRegistry,
  type CeremonyTransport,
} from '../../src/http';
import type {
  CertificationRegistry,
  WebAuthnCeremony,
} from '../../src/index';

const startRegistration = jest.fn();
const startAuthentication = jest.fn();
jest.mock('@simplewebauthn/browser', () => ({
  startRegistration,
  startAuthentication,
}));

/** The port doubles: the use case must not care how the routes are spelled. */
function stubRegistry() {
  const registration = {
    challengeId: 'c1',
    options: { challenge: 'x' } as PublicKeyCredentialCreationOptionsJSON,
  } satisfies WebAuthnCeremony<PublicKeyCredentialCreationOptionsJSON>;
  const decision = {
    challengeId: 'c2',
    options: { challenge: 'y' } as PublicKeyCredentialRequestOptionsJSON,
  } satisfies WebAuthnCeremony<PublicKeyCredentialRequestOptionsJSON>;
  const registry: CertificationRegistry = {
    registrationOptions: jest.fn(async () => registration),
    verifyRegistration: jest.fn(async () => ({ credentialId: 'key-1' })),
    decisionOptions: jest.fn(async () => decision),
    recordDecision: jest.fn(async () => ({ status: 'aprobada' })),
  };
  const webauthn = {
    register: jest.fn(async () => ({ id: 'key-1' })),
    authenticate: jest.fn(async () => ({ id: 'key-1' })),
  };
  return { registry, webauthn };
}

const post = jest.fn();
const transport: CeremonyTransport = { post };

describe('audit decisions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completes registration without exposing private key material', async () => {
    const { registry, webauthn } = stubRegistry();

    await expect(
      createAuditCertification({ registry, webauthn }).registerAuditorPasskey(
        'https://api.test',
      ),
    ).resolves.toEqual({ credentialId: 'key-1' });

    // The browser owns the private key; only the public credential travels.
    expect(registry.verifyRegistration).toHaveBeenCalledWith(
      'https://api.test',
      { challengeId: 'c1', options: { challenge: 'x' } },
      { id: 'key-1' },
    );
  });

  it('sends the same decision fields with the signed assertion', async () => {
    const { registry, webauthn } = stubRegistry();

    await createAuditCertification({ registry, webauthn }).signAuditDecision(
      'https://api.test',
      { packageId: 'pkg', versionId: '1.0.0', productId: 's4' },
      { approve: true, notes: 'reviewed' },
    );

    expect(registry.decisionOptions).toHaveBeenCalledWith(
      'https://api.test',
      { packageId: 'pkg', versionId: '1.0.0', productId: 's4' },
      { approve: true, notes: 'reviewed' },
    );
    expect(registry.recordDecision).toHaveBeenCalledWith(
      'https://api.test',
      { packageId: 'pkg', versionId: '1.0.0', productId: 's4' },
      { approve: true, notes: 'reviewed' },
      { challengeId: 'c2', options: { challenge: 'y' } },
      { id: 'key-1' },
    );
  });
});

describe('the HTTP certification registry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('addresses the certification routes, escaping the target segments', async () => {
    const registry = createHttpCertificationRegistry(transport);
    post.mockResolvedValue({ challengeId: 'c1', options: { challenge: 'x' } });

    await registry.registrationOptions('https://api.test/');

    expect(post).toHaveBeenCalledWith(
      'https://api.test/v1/certifications/auditor/credentials/options',
    );
  });

  it('posts the decision and the assertion to the target route', async () => {
    const registry = createHttpCertificationRegistry(transport);
    post.mockResolvedValue({ status: 'aprobada' });

    await registry.recordDecision(
      'https://api.test',
      { packageId: 'pkg/name', versionId: '1.0.0', productId: 's4' },
      { approve: true, notes: 'reviewed' },
      { challengeId: 'c2', options: { challenge: 'y' } },
      { id: 'key-1' },
    );

    expect(post).toHaveBeenCalledWith(
      'https://api.test/v1/certifications/pkg%2Fname/1.0.0/s4/decision',
      {
        approve: true,
        notes: 'reviewed',
        challengeId: 'c2',
        assertion: { id: 'key-1' },
      },
    );
  });
});
