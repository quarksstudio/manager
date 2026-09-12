import * as os from 'os';

jest.mock('ink', () => ({ render: jest.fn(() => ({ unmount: jest.fn() })) }));
jest.mock('./PublishScreen', () => ({
  __esModule: true,
  PublishScreen: () => null,
}));

import Publish from './publish-action';

describe('Publish action', () => {
  it('is exported as a function', () => {
    expect(typeof Publish).toBe('function');
  });

  it('renders the publish screen', () => {
    const root = os.tmpdir();
    expect(() => Publish(root, { upload: false })).not.toThrow();
  });
});
