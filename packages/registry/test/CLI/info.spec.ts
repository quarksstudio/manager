import Info from '../../src/CLI/info-action';

jest.mock('ink', () => ({ render: jest.fn() }));
jest.mock('../../src/CLI/InfoScreen', () => ({
  __esModule: true,
  default: () => null,
}));

describe('Info action', () => {
  it('is exported as a function', () => {
    expect(typeof Info).toBe('function');
  });

  it('renders the info screen', () => {
    expect(() => Info('@quarks.studio/cli')).not.toThrow();
  });
});
