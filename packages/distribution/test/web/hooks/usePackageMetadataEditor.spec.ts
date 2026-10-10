import React from 'react';
import {
  DistributionProvider,
  type DistributionServices,
} from '@quarks.studio/distribution/presentation';
import {
  act,
  waitFor,
  renderHook as renderHookWithServices,
} from '@testing-library/react';

import {
  usePackageMetadataEditor,
  normalizeTag,
} from '../../../src/hooks/usePackageMetadataEditor';

const mockSaveMetadata = jest.fn();
let mockUser = { id: 'alice' };

const services: DistributionServices = {
  get: jest.fn(),
  getReadme: jest.fn(),
  update: mockSaveMetadata,
  downloadBundle: jest.fn(),
  getCurrentUser: async () => mockUser,
};

const renderHook: typeof renderHookWithServices = (callback, options) =>
  renderHookWithServices(callback, {
    ...options,
    wrapper: ({ children }) =>
      React.createElement(DistributionProvider, { services, children }),
  });

const DETAIL = {
  id: 'demo',
  name: 'demo',
  description: 'Demo package',
  authors: ['alice'],
  tags: ['demo'],
  isPrivate: true,
  downloads: 0,
  canEditMetadata: true,
  versions: [],
};

beforeEach(() => {
  mockSaveMetadata.mockReset();
  mockUser = { id: 'alice' };
});

describe('normalizeTag', () => {
  it('trims, lowercases and replaces spaces', () => {
    expect(normalizeTag('  Hello World ')).toBe('hello-world');
  });
});

describe('usePackageMetadataEditor', () => {
  it('seeds fields from the detail on startEditing', () => {
    const { result } = renderHook(() =>
      usePackageMetadataEditor(DETAIL, 'alice'),
    );
    act(() => result.current.startEditing());
    expect(result.current.description).toBe('Demo package');
    expect(result.current.authors).toEqual(['alice']);
    expect(result.current.isPrivate).toBe(true);
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

  it('blocks removing yourself as an author', async () => {
    const { result } = renderHook(() => usePackageMetadataEditor(DETAIL));
    act(() => result.current.startEditing());
    await waitFor(() =>
      expect(result.current.cannotRemoveAuthor('alice')).toBe(true),
    );
    expect(result.current.cannotRemoveAuthor('bob')).toBe(false);
  });

  it('saves normalized fields for a valid input', async () => {
    const onSaved = jest.fn();
    const { result } = renderHook(() =>
      usePackageMetadataEditor(DETAIL, 'alice', onSaved),
    );
    act(() => result.current.startEditing());
    act(() => result.current.setIsPrivate(false));
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
      authors: ['alice'],
      isPrivate: false,
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
