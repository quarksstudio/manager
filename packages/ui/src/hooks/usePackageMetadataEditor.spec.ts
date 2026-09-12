import { act, renderHook } from '@testing-library/react';

import {
  usePackageMetadataEditor,
  normalizeTag,
} from './usePackageMetadataEditor';

const mockSaveMetadata = jest.fn();
let mockUser = { id: 'alice' };
let mockStatus = 'idle';
let mockSaveError: Error | null = null;

jest.mock('@quark/registry', () => ({
  useCurrentUser: () => ({ data: mockUser }),
  useUpdatePackageMetadata: () => ({
    save: mockSaveMetadata,
    status: mockStatus,
    error: mockSaveError,
  }),
}));

const DETAIL = {
  id: 'demo',
  name: 'demo',
  description: 'Demo package',
  authors: ['alice'],
  tags: ['demo'],
  downloads: 0,
  canEditMetadata: true,
  versions: [],
};

beforeEach(() => {
  mockSaveMetadata.mockReset();
  mockUser = { id: 'alice' };
  mockStatus = 'idle';
  mockSaveError = null;
});

describe('normalizeTag', () => {
  it('trims, lowercases and replaces spaces', () => {
    expect(normalizeTag('  Hello World ')).toBe('hello-world');
  });
});

describe('usePackageMetadataEditor', () => {
  it('seeds fields from the detail on startEditing', () => {
    const { result } = renderHook(() => usePackageMetadataEditor(DETAIL));
    act(() => result.current.startEditing());
    expect(result.current.description).toBe('Demo package');
    expect(result.current.tags).toEqual(['demo']);
    expect(result.current.authors).toEqual(['alice']);
  });

  it('rejects an empty description', async () => {
    const onSaved = jest.fn();
    const { result } = renderHook(() =>
      usePackageMetadataEditor(DETAIL, '', onSaved),
    );
    act(() => result.current.startEditing());
    act(() => result.current.setDescription('   '));
    let ok: boolean | null = null;
    await act(async () => {
      ok = await result.current.save();
    });
    expect(ok).toBe(false);
    expect(result.current.validation.description).toMatch(/required/i);
    expect(mockSaveMetadata).not.toHaveBeenCalled();
  });

  it('blocks removing yourself as an author', () => {
    const { result } = renderHook(() => usePackageMetadataEditor(DETAIL));
    act(() => result.current.startEditing());
    expect(result.current.cannotRemoveAuthor('alice')).toBe(true);
    expect(result.current.cannotRemoveAuthor('bob')).toBe(false);
  });

  it('saves normalized fields for a valid input', async () => {
    const onSaved = jest.fn();
    const { result } = renderHook(() =>
      usePackageMetadataEditor(DETAIL, 'alice', onSaved),
    );
    act(() => result.current.startEditing());
    act(() => result.current.addTag());
    act(() => result.current.setTagInput('  Web Tool '));
    act(() => result.current.addTag());
    let ok: boolean | null = null;
    await act(async () => {
      ok = await result.current.save();
    });
    expect(ok).toBe(true);
    expect(result.current.isEditing).toBe(false);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(mockSaveMetadata).toHaveBeenCalledWith({
      id: 'demo',
      description: 'Demo package',
      tags: ['demo', 'web-tool'],
      authors: ['alice'],
    });
  });

  it('propagates a save error', async () => {
    mockSaveMetadata.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() =>
      usePackageMetadataEditor(DETAIL, 'alice'),
    );
    act(() => result.current.startEditing());
    let ok: boolean | null = null;
    await act(async () => {
      ok = await result.current.save();
    });
    expect(ok).toBe(false);
  });
});
