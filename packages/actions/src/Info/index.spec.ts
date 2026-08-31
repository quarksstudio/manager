import Info from './index';

describe('Info action', () => {
  it('is exported as a function', () => {
    expect(typeof Info).toBe('function');
  });

  it('returns a status string', () => {
    expect(Info('@quark/cli')).toEqual('actions');
  });
});
