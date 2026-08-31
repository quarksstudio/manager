import { PermissionPolicy } from './permission-policy';

describe('PermissionPolicy', () => {
  it('evaluates domain and tool wildcards with deny by default', () => {
    const decision = new PermissionPolicy({
      allowedDomains: ['*.example.com'],
      allowedTools: ['orders.*'],
      allowFilesystem: false,
    }).evaluate({
      network: ['api.example.com', 'evil.test'],
      tools: ['orders.read', 'users.write'],
      filesystem: true,
    });
    expect(decision).toEqual({
      granted: false,
      denied: {
        network: ['evil.test'],
        tools: ['users.write'],
        filesystem: true,
      },
    });
  });
});
