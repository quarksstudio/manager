import { filterPackages } from '../../../src/catalog/domain/package-search-query';
import type { PackageSearchItem } from '../../../src/catalog/domain/package-search-item';

/**
 * The query is the one piece of catalog behaviour that is pure, so this is where
 * ranking and matching are pinned down rather than inferred from a HTTP mock.
 */
describe('filterPackages', () => {
  const chat = item('chat', 'Chat assistant', ['ai', 'chat']);
  const chatPro = item('chat', 'Chat assistant plus', ['ai']);
  const review = item('review', 'Code reviewer', ['dev']);

  it('ranks an exact name match above a prefix, and a prefix above the rest', () => {
    // `chatty` matches as a name prefix; `zulu` matches only in its
    // description, so it scores lowest; `chat` is the exact name.
    const anywhere = item('zulu', 'Chat assistant', ['ai']);
    const result = filterPackages([anywhere, chat, item('chatty', 'Nope', [])], {
      query: 'chat',
    });
    expect(result.map((entry) => entry.name)).toEqual([
      'chat',
      'chatty',
      'zulu',
    ]);
  });

  it('is case insensitive and searches the description and tags', () => {
    expect(
      filterPackages([chat, review], { query: 'CHAT' }).map((e) => e.name),
    ).toEqual(['chat']);
    expect(
      filterPackages([chat, review], { description: 'reviewer' }).map(
        (e) => e.name,
      ),
    ).toEqual(['review']);
    expect(filterPackages([chat, review], { tags: ['dev'] })).toEqual([review]);
  });

  it('requires every tag in `all` mode and one tag in `any` mode', () => {
    expect(
      filterPackages([chat, review], { tags: ['ai', 'chat'] }, {
        matchMode: 'all',
      }),
    ).toEqual([chat]);
    // `review` has neither tag, so `any` cannot rescue it here.
    expect(
      filterPackages([chat, review], { tags: ['ai', 'dev'] }, {
        matchMode: 'any',
      }).map((e) => e.name),
    ).toEqual(['chat', 'review']);
  });

  it('treats an exact filter as an equality check, not a substring one', () => {
    expect(filterPackages([chat], { name: 'cha' }, { exact: true })).toEqual([]);
    expect(filterPackages([chat], { name: 'chat' }, { exact: true })).toEqual([
      chat,
    ]);
  });

  it('breaks score ties by name and then by the newest version', () => {
    const old = item('chat', 'Chat assistant', ['ai'], '1.0.0');
    const recent = item('chat', 'Chat assistant', ['ai'], '2.0.0');
    expect(filterPackages([old, recent], { query: 'chat' })).toEqual([
      recent,
      old,
    ]);
  });

  it('returns everything for empty filters and does not mutate the input', () => {
    const input = [review, chatPro, chat];
    const snapshot = [...input];
    expect(filterPackages(input, {})).toHaveLength(3);
    expect(filterPackages(input, { query: '   ' })).toHaveLength(3);
    expect(input).toEqual(snapshot);
  });
});

function item(
  name: string,
  description: string,
  tags: string[],
  version = '1.0.0',
): PackageSearchItem {
  return { name, version, description, tags };
}
