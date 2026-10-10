import { useCallback, useState } from 'react';
import { useQuery } from '@quarks.studio/storage/query';
import { useDistributionServices } from './useDistributionServices';
import { useUpdatePackageMetadata } from './useUpdatePackageMetadata';
export { normalizeTag } from '../domain/update-package-metadata';
import { type PackageDetails } from '../domain/package-details';

const MAX_DESCRIPTION = 500;

export interface PackageMetadataDraft {
  description: string;
  authors: string[];
  isPrivate: boolean;
}

export interface PackageMetadataValidation {
  description?: string;
  authors?: string;
}

export interface UsePackageMetadataEditorReturn {
  isEditing: boolean;
  startEditing: () => void;
  cancelEdit: () => void;
  description: string;
  setDescription: (value: string) => void;
  isPrivate: boolean;
  setIsPrivate: (value: boolean) => void;
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
  const services = useDistributionServices();
  const loadUser = useCallback(() => services.getCurrentUser(), [services]);
  const { data: user } = useQuery(loadUser, !currentUserId);
  const identity = currentUserId || user?.id || '';
  const { save: saveMetadata, status, error } = useUpdatePackageMetadata();

  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [authors, setAuthors] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [authorInput, setAuthorInput] = useState('');
  const [validation, setValidation] = useState<PackageMetadataValidation>({});

  const startEditing = useCallback(() => {
    setDescription(detail?.description ?? '');
    setAuthors(detail?.authors ?? []);
    setIsPrivate(detail?.isPrivate ?? false);
    setValidation({});
    setIsEditing(true);
  }, [detail]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setValidation({});
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
    const errors: PackageMetadataValidation = {};
    const trimmed = description.trim();
    if (!trimmed) {
      errors.description = 'Description is required.';
    } else if (trimmed.length > MAX_DESCRIPTION) {
      errors.description = `Description must be ${MAX_DESCRIPTION} characters or fewer.`;
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
        authors: cleanedAuthors,
        isPrivate,
      });
      setIsEditing(false);
      await onSaved?.();
      return true;
    } catch {
      return false;
    }
  }, [
    authors,
    description,
    detail,
    identity,
    isPrivate,
    onSaved,
    saveMetadata,
  ]);

  return {
    isEditing,
    startEditing,
    cancelEdit,
    description,
    setDescription,
    isPrivate,
    setIsPrivate,
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
