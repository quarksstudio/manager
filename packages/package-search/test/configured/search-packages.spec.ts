import { createStorage } from '@quarks.studio/storage';

import { createGlobalContext } from '@quarks.studio/config/http';
import {
  filterPackages,
  resetPackageCatalogMemory,
  searchPackages,
  type PackageSearchItem,
} from '../../src/configured';

const values = new Map<string, unknown>();
const fetchJson = jest.fn();

jest.mock('@quarks.studio/storage', () => ({
  createStorage: jest.fn(() => ({
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  })),
}));

jest.mock('@quarks.studio/config/http', () => ({
  ...jest.requireActual('@quarks.studio/config/http'),
  createGlobalContext: jest.fn(),
}));

const context = createGlobalContext as jest.MockedFunction<
  typeof createGlobalContext
>;

describe('searchPackages', () => {
  beforeEach(async () => {
    values.clear();
    resetPackageCatalogMemory();
    jest.clearAllMocks();
    context.mockResolvedValue({ fetchJson } as never);
    process.env['QUARK_REGISTRY_URL'] = 'https://registry.test/v1';
  });

  it('filters the local catalog across fields and tags', async () => {
    values.set('packages', {
      alpha: item('alpha', 'Chat assistant', ['ai', 'chat']),
      beta: item('beta', 'Code reviewer', ['dev']),
    });
    fetchJson.mockResolvedValue({ items: [], totalCount: 0, nextCursor: null });

    const result = await searchPackages(
      { query: 'CHAT', tags: ['ai', 'missing'] },
      { matchMode: 'any' },
    );

    expect(result.localResults).toEqual([
      item('alpha', 'Chat assistant', ['ai', 'chat']),
    ]);
  });

  it('returns local results before remote and upserts remote packages', async () => {
    values.set('packages', { local: item('local', 'Local', []) });
    fetchJson.mockResolvedValue({
      items: [
        {
          name: 'remote',
          summary: 'Remote',
          tags: ['web'],
          latestVersion: '2.0.0',
        },
      ],
      totalCount: 1,
      nextCursor: 'next',
    });

    const hybrid = await searchPackages({ query: '' });
    expect(hybrid.localResults).toEqual([item('local', 'Local', [])]);
    await expect(hybrid.remote).resolves.toMatchObject({
      items: [{ name: 'remote', version: '2.0.0' }],
      nextCursor: 'next',
    });
    expect(createStorage).toHaveBeenCalledWith({
      namespace: 'package-catalog',
    });
    expect(values.get('packages')).toMatchObject({
      remote: { version: '2.0.0' },
    });
  });

  it('supports exact and all-tag matching', () => {
    const packages = [item('agent', 'Agent helper', ['AI', 'chat'])];
    expect(filterPackages(packages, { name: 'age' })).toHaveLength(1);
    expect(
      filterPackages(packages, { name: 'age' }, { exact: true }),
    ).toHaveLength(0);
    expect(
      filterPackages(packages, { tags: ['ai', 'chat'] }, { matchMode: 'all' }),
    ).toHaveLength(1);
  });
});

function item(
  name: string,
  summary: string,
  tags: string[],
): PackageSearchItem {
  return { name, version: '1.0.0', summary, tags };
}
