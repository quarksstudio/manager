// The configuration is consumed by headless CLIs, the Astro server, and the
// Electron shell. It must never reach for React, or those entry points drag a
// UI runtime into a process that has no renderer. The React hook lives behind
// `@quarks.studio/config/hooks` for exactly that reason.
jest.mock('react', () => {
  throw new Error('the configuration must not load React');
});
jest.mock('ink', () => {
  throw new Error('the configuration must not load Ink');
});

describe('headless entry point', () => {
  it('loads the whole configuration surface without React or Ink', () => {
    expect(() =>
      jest.isolateModules(() => {
        const config = require('../src/index');
        expect(config.loadConfig).toBeDefined();
        expect(config.saveSession).toBeDefined();
        expect(config.writeConfig).toBeDefined();
      }),
    ).not.toThrow();
  });
});
