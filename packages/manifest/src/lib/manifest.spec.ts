import { validateManifest, parseManifest } from './manifest';

describe('manifest validation', () => {
  it('successfully validates a valid manifest', () => {
    const validJson = {
      name: '@axcel/route-intelligence',
      version: '1.4.2',
      description: 'Optimization and dispatch routing skill',
      entrypoint: './src/index.py',
      runtime: {
        python: '>=3.12',
      },
      models: ['openai/*', 'anthropic/*'],
      permissions: {
        network: ['api.axcel.com'],
        tools: ['orders.read', 'routes.write'],
        filesystem: false,
      },
      dependencies: {
        '@skill/maps': '^2.1.0',
        '@skill/geocoder': '^1.8.0',
      },
      certification: {
        required: 'S2',
      },
    };

    const res = validateManifest(validJson);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe('@axcel/route-intelligence');
      expect(res.data.permissions?.filesystem).toBe(false);
    }
  });

  it('fails validation when required fields are missing', () => {
    const invalidJson = {
      name: '@axcel/route-intelligence',
      // version and entrypoint missing
    };

    const res = validateManifest(invalidJson);
    expect(res.success).toBe(false);
  });
});
