import Info from './info-action';

jest.mock('ink', () => ({ render: jest.fn() }));
jest.mock('./InfoScreen', () => ({
  __esModule: true,
  default: () => null,
}));

describe('Info action', () => {
  it('is exported as a function', () => {
    expect(typeof Info).toBe('function');
  });

  it('renders the info screen', () => {
    expect(() => Info('@quark/cli')).not.toThrow();
  });
});
