export interface PublicUserProfile {
  id: string;
  username: string;
  displayName?: string;
  photoURL: string | null;
  /** ISO 8601, or null for legacy records without a valid join date. */
  createdAt: string | null;
}
