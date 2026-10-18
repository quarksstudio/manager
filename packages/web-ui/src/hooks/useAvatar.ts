import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createConfiguredContext } from '@quarks.studio/config/http';

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;
const AVATAR_HOSTS = [
  'gravatar.com',
  'googleusercontent.com',
  'githubusercontent.com',
  'twimg.com',
  'fbcdn.net',
  'fbsbx.com',
] as const;

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

/** Loads public avatar details for a group of usernames. */
export function useAvatar(people: readonly string[] = [], apiBaseUrl?: string) {
  const peopleKey = JSON.stringify(people);
  const usernames = useMemo(
    () =>
      normalizeUsernames(JSON.parse(peopleKey) as string[]).slice(
        0,
        MAX_AVATAR_USERS,
      ),
    [peopleKey],
  );
  const context = useMemo(
    () => createConfiguredContext(apiBaseUrl),
    [apiBaseUrl],
  );
  const [data, setData] = useState<AvatarUser[]>([]);
  const [loading, setLoading] = useState(usernames.length > 0);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    if (!usernames.length) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    const query = encodeURIComponent(usernames.join(','));
    void context
      .fetchJson<AvatarUser[]>(`users?usernames=${query}`)
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
  }, [usernames, context, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data, loading, error, reload };
}
