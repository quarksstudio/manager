import { render } from 'ink';
import { Get, Set } from './config-actions';

jest.mock('ink', () => ({ render: jest.fn() }));
jest.mock('./ConfigGetScreen', () => ({ ConfigGetScreen: () => null }));
jest.mock('./ConfigSetScreen', () => ({ ConfigSetScreen: () => null }));
jest.mock('./ConfigListScreen', () => ({ ConfigListScreen: () => null }));

describe('config command adapters', () => {
  beforeEach(() => jest.clearAllMocks());
  it('passes positional keys as ordinary props, not React keys', () => {
    Get('editor');
    const element = (render as jest.Mock).mock.calls[0][0];
    expect(element.props.configKey).toBe('editor');
    expect(element.key).toBeNull();
  });
  it('supports both positional and existing object arguments', () => {
    Set('editor', 'vim');
    Set({ key: 'colors', value: 'false' });
    expect(
      (render as jest.Mock).mock.calls.map(([element]) => element.props),
    ).toEqual([
      { configKey: 'editor', value: 'vim' },
      { configKey: 'colors', value: 'false' },
    ]);
  });
});
