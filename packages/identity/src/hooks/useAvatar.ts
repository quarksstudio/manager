import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createConfiguredContext } from '@quarks.studio/config/http';
import type { PublicUserProfile } from '../domain/public-user-profile';
import { createHttpPublicUsers } from '../infrastructure/http-public-user';

export interface AvatarUser {
  username: string;
  photo: string | null;
  displayName: string;
}

/** Loads public avatar details for a group of usernames. */
export function useAvatar(people: string[] = [], apiBaseUrl?: string) {
  const peopleKey = people.join('\u0000');
  const usernames = useMemo(() => {
    return [
      ...new Set(
        peopleKey
          .split('\u0000')
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    ];
  }, [peopleKey]);
  const services = useMemo(
    () => createHttpPublicUsers(createConfiguredContext(apiBaseUrl)),
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
    void services
      .getMany(usernames)
      .then((users: PublicUserProfile[]) => {
        if (!active || currentRequest !== requestId.current) return;
        const usersByUsername = new Map(
          users.map((user) => [user.username, user]),
        );
        setData(
          usernames.flatMap((username) => {
            const user = usersByUsername.get(username);
            return user
              ? [
                  {
                    username: user.username,
                    photo: user.photoURL,
                    displayName: user.displayName || user.username,
                  },
                ]
              : [];
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
  }, [usernames, services, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data, loading, error, reload };
}
