import { useCallback, useState } from 'react';
import {
  useCurrentUser,
  useUpdatePackageMetadata,
  type PackageDetails,
} from '@quark/registry';

const MAX_DESCRIPTION = 500;
const MAX_TAG_LENGTH = 32;

export interface PackageMetadataDraft {
  description: string;
  tags: string[];
  authors: string[];
}

export interface PackageMetadataValidation {
  description?: string;
  tags?: string;
  authors?: string;
}

export function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, '-').toLowerCase();
}

export interface UsePackageMetadataEditorReturn {
  isEditing: boolean;
  startEditing: () => void;
  cancelEdit: () => void;
  description: string;
  setDescription: (value: string) => void;
  tags: string[];
  tagInput: string;
  setTagInput: (value: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
  authors: string[];
  authorInput: string;
  setAuthorInput: (value: string) => void;
  addAuthor: () => void;
  removeAuthor: (author: string) => void;
  cannotRemoveAuthor: (author: string) => boolean;
  validation: PackageMetadataValidation;
  saving: boolean;
  saveError: Error | null;
  saved: boolean;
  save: () => Promise<boolean>;
}

export function usePackageMetadataEditor(
  detail: PackageDetails | null,
  currentUserId = '',
  onSaved?: () => void,
): UsePackageMetadataEditorReturn {
  const { data: user } = useCurrentUser<{ id: string }>();
  const identity = currentUserId || user?.id || '';
  const { save: saveMetadata, status, error } = useUpdatePackageMetadata();

  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [validation, setValidation] = useState<PackageMetadataValidation>({});

  const startEditing = useCallback(() => {
    setDescription(detail?.description ?? '');
    setTags(detail?.tags ?? []);
    setAuthors(detail?.authors ?? []);
    setValidation({});
    setIsEditing(true);
  }, [detail]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setValidation({});
  }, []);

  const addTag = useCallback(() => {
    const normalized = normalizeTag(tagInput);
    if (!normalized) return;
    setTags((current) =>
      current.includes(normalized) ? current : [...current, normalized],
    );
    setTagInput('');
  }, [tagInput]);

  const removeTag = useCallback((tag: string) => {
    setTags((current) => current.filter((item) => item !== tag));
  }, []);

  const addAuthor = useCallback(() => {
    const candidate = authorInput.trim();
    if (!candidate) return;
    setAuthors((current) =>
      current.includes(candidate) ? current : [...current, candidate],
    );
    setAuthorInput('');
  }, [authorInput]);

  const removeAuthor = useCallback((author: string) => {
    setAuthors((current) => current.filter((item) => item !== author));
  }, []);

  const cannotRemoveAuthor = useCallback(
    (author: string) => author === identity,
    [identity],
  );

  const save = useCallback(async () => {
    if (!detail) return false;
    const normalizedTags = tags.map(normalizeTag);
    const errors: PackageMetadataValidation = {};
    const trimmed = description.trim();
    if (!trimmed) {
      errors.description = 'Description is required.';
    } else if (trimmed.length > MAX_DESCRIPTION) {
      errors.description = `Description must be ${MAX_DESCRIPTION} characters or fewer.`;
    }
    if (normalizedTags.length !== new Set(normalizedTags).size) {
      errors.tags = 'Tags must be unique.';
    }
    if (normalizedTags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      errors.tags = `Tags must be ${MAX_TAG_LENGTH} characters or fewer.`;
    }
    const cleanedAuthors = authors
      .map((author) => author.trim())
      .filter(Boolean);
    if (cleanedAuthors.length === 0) {
      errors.authors = 'At least one author is required.';
    }
    if (!identity) {
      errors.authors = 'You must be signed in to edit metadata.';
    } else if (!cleanedAuthors.includes(identity)) {
      errors.authors = 'You cannot remove yourself as an author.';
    }
    setValidation(errors);
    if (Object.keys(errors).length > 0) return false;

    try {
      await saveMetadata({
        id: detail.id,
        description: trimmed,
        tags: normalizedTags,
        authors: cleanedAuthors,
      });
      setIsEditing(false);
      await onSaved?.();
      return true;
    } catch {
      return false;
    }
  }, [authors, description, detail, identity, onSaved, saveMetadata, tags]);

  return {
    isEditing,
    startEditing,
    cancelEdit,
    description,
    setDescription,
    tags,
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    authors,
    authorInput,
    setAuthorInput,
    addAuthor,
    removeAuthor,
    cannotRemoveAuthor,
    validation,
    saving: status === 'saving',
    saveError: error,
    saved: status === 'success',
    save,
  };
}
