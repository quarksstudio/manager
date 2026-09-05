import type { Signer } from '../types';
export declare class Ed25519Signer implements Signer {
  private readonly privateKeyPem;
  private readonly keyId?;
  constructor(privateKeyPem: string | Buffer, keyId?: string | undefined);
  sign(payload: Buffer): Promise<{
    signature: string;
    keyId?: string;
  }>;
}
