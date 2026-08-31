import { validatePermissions } from './permissions';
import type { Manifest } from '@quark/manifest';

describe('permissions policy engine', () => {
  const sampleManifest: Manifest = {
    name: '@foo/bar',
    version: '1.0.0',
    entrypoint: './index.js',
    permissions: {
      network: ['api.axcel.com', 'google.com'],
      tools: ['orders.read', 'routes.write'],
      filesystem: true,
    },
  };

  it('should deny filesystem if policy does not allow it', () => {
    const policy = {
      allowedDomains: ['*'],
      allowedTools: ['*'],
      allowFilesystem: false,
    };

    const res = validatePermissions(sampleManifest, policy);
    expect(res.granted).toBe(false);
    expect(res.deniedPermissions.filesystem).toBe(true);
    expect(res.deniedPermissions.network).toBeUndefined();
  });

  it('should deny network domains not matched by wildcard or exact match', () => {
    const policy = {
      allowedDomains: ['*.axcel.com'],
      allowedTools: ['*'],
      allowFilesystem: true,
    };

    const res = validatePermissions(sampleManifest, policy);
    expect(res.granted).toBe(false);
    expect(res.deniedPermissions.network).toEqual(['google.com']);
  });

  it('should deny tools not matched by prefix wildcard', () => {
    const policy = {
      allowedDomains: ['*'],
      allowedTools: ['orders.*'],
      allowFilesystem: true,
    };

    const res = validatePermissions(sampleManifest, policy);
    expect(res.granted).toBe(false);
    expect(res.deniedPermissions.tools).toEqual(['routes.write']);
  });

  it('should grant everything if policy is fully permissive', () => {
    const policy = {
      allowedDomains: ['*'],
      allowedTools: ['*'],
      allowFilesystem: true,
    };

    const res = validatePermissions(sampleManifest, policy);
    expect(res.granted).toBe(true);
    expect(res.deniedPermissions).toEqual({});
  });
});
