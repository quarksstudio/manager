import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;
export const MAX_AVATAR_USERS = 50;

function normalizeUsernames(people: readonly string[]): string[] {
  return [
    ...new Set(
      people
        .map((name) => name.trim().toLowerCase())
        .filter((name) => USERNAME_PATTERN.test(name)),
    ),
  ];
}

export interface AvatarUser {
  id: string;
  username: string;
  displayName: string;
  photoURL: string | null;
}

export type AvatarUserLoader = (
  usernames: readonly string[],
) => Promise<AvatarUser[]>;

/** Loads public avatar details for a group of usernames. */
export function useAvatar(
  people: readonly string[] = [],
  loadUsers?: AvatarUserLoader,
) {
  const peopleKey = JSON.stringify(people);
  const usernames = useMemo(
    () =>
      normalizeUsernames(JSON.parse(peopleKey) as string[]).slice(
        0,
        MAX_AVATAR_USERS,
      ),
    [peopleKey],
  );
  const [data, setData] = useState<AvatarUser[]>([]);
  const [loading, setLoading] = useState(usernames.length > 0 && !!loadUsers);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    if (!usernames.length || !loadUsers) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void loadUsers(usernames)
      .then((users) => {
        if (!active || currentRequest !== requestId.current) return;
        const usersByUsername = new Map(
          users.map((user) => [user.username, user]),
        );
        setData(
          usernames.flatMap((username) => {
            const user = usersByUsername.get(username);
            return user ? [user] : [];
          }),
        );
      })
      .catch((cause: unknown) => {
        if (!active || currentRequest !== requestId.current) return;
        setData([]);
        setError(cause);
      })
      .finally(() => {
        if (active && currentRequest === requestId.current) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [usernames, loadUsers, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data, loading, error, reload };
}
