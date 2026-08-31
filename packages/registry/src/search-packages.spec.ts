import { createStorage } from '@quark/use-storage';

import { apiFetch } from './lib/api-fetch';
import { Client } from './lib';
import {
  filterPackages,
  resetPackageCatalogMemory,
  searchPackages,
  type PackageSearchItem,
} from './search-packages';

const values = new Map<string, unknown>();

jest.mock('@quark/use-storage', () => ({
  createStorage: jest.fn(() => ({
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  })),
}));

jest.mock('./lib/api-fetch', () => ({ apiFetch: jest.fn() }));

const fetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('searchPackages', () => {
  beforeEach(() => {
    values.clear();
    resetPackageCatalogMemory();
    fetchMock.mockReset();
    Client.API = 'https://registry.test/v1';
  });

  it('filters the local catalog across fields and tags', async () => {
    values.set('packages', {
      alpha: item('alpha', 'Chat assistant', ['ai', 'chat']),
      beta: item('beta', 'Code reviewer', ['dev']),
    });
    fetchMock.mockResolvedValue({ items: [], totalCount: 0, nextCursor: null });

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
    fetchMock.mockResolvedValue({
      items: [
        {
          id: 'remote',
          description: 'Remote',
          tags: ['web'],
          latest: { version: '2.0.0' },
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
  description: string,
  tags: string[],
): PackageSearchItem {
  return { name, version: '1.0.0', description, tags };
}
