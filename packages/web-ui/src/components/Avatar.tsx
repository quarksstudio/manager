import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar as AntAvatar, Spin, Tooltip } from 'antd';
import type { AvatarProps as AntAvatarProps } from 'antd/es/avatar';
import { UserOutlined } from '@ant-design/icons';
import { createConfiguredContext } from '@quarks.studio/config/http';

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;
export const MAX_AVATAR_USERS = 50;
const AVATAR_HOSTS = [
  'gravatar.com',
  'googleusercontent.com',
  'githubusercontent.com',
  'twimg.com',
  'fbcdn.net',
  'fbsbx.com',
] as const;

function normalizeUsernames(people: readonly string[]): string[] {
  return [
    ...new Set(
      people
        .map((name) => name.trim().toLowerCase())
        .filter((name) => USERNAME_PATTERN.test(name)),
    ),
  ];
}

function isAllowedAvatarHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return AVATAR_HOSTS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

export interface AvatarUser {
  id: string;
  username: string;
  displayName: string;
  photoURL: string | null;
}

export type UserAvatarProps = Omit<AntAvatarProps, 'src'> & {
  username?: string;
  'aria-label'?: string;
  src?: string | null;
};

function safePhotoUrl(photoURL: string | null | undefined): string | undefined {
  if (!photoURL) return undefined;
  try {
    const url = new URL(photoURL);
    if (
      !url.username &&
      !url.password &&
      url.protocol === 'https:' &&
      isAllowedAvatarHost(url.hostname)
    )
      return url.href;
  } catch {
    // Ignore malformed avatar URLs and render the fallback icon.
  }
  return undefined;
}

/** Shared avatar renderer with safe remote-image defaults. */
export function UserAvatar({
  username,
  src,
  icon,
  alt,
  children,
  'aria-label': ariaLabel,
  ...props
}: UserAvatarProps) {
  const photoURL = safePhotoUrl(src);
  const accessibleLabel =
    ariaLabel ?? (username ? `Avatar of ${username}` : undefined);
  const safeSrc = photoURL ? (
    <img src={photoURL} alt={alt ?? ''} referrerPolicy="no-referrer" />
  ) : undefined;
  const avatar = (
    <AntAvatar
      {...props}
      alt={accessibleLabel ? '' : alt}
      src={safeSrc}
      icon={icon ?? (!children ? <UserOutlined /> : undefined)}
    >
      {children}
    </AntAvatar>
  );

  return accessibleLabel ? (
    <span role="img" aria-label={accessibleLabel}>
      {avatar}
    </span>
  ) : (
    avatar
  );
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

export function GroupAvatar({
  people = [],
  maxCount = MAX_AVATAR_USERS,
}: {
  people?: readonly string[];
  maxCount?: number;
}) {
  const { data, loading } = useAvatar(people);
  const peopleKey = JSON.stringify(people);
  const usernames = useMemo(
    () => normalizeUsernames(JSON.parse(peopleKey) as string[]),
    [peopleKey],
  );
  const requestedMaxCount = Number.isFinite(maxCount)
    ? Math.max(1, Math.floor(maxCount))
    : MAX_AVATAR_USERS;
  const displayLimit = Math.min(requestedMaxCount, MAX_AVATAR_USERS);
  const hasOverflow = usernames.length > displayLimit;
  const visibleCount = hasOverflow ? displayLimit - 1 : displayLimit;
  const omittedCount = Math.max(0, usernames.length - visibleCount);

  return (
    <Spin spinning={loading} size="small">
      <AntAvatar.Group>
        {data
          .slice(0, visibleCount)
          .map(({ username, photoURL, displayName }) => (
            <Tooltip key={username} title={displayName} placement="top">
              <a href={`/~/${encodeURIComponent(username)}`}>
                <UserAvatar username={username} size={32} src={photoURL} />
              </a>
            </Tooltip>
          ))}
        {hasOverflow && (
          <Tooltip title={`${omittedCount} more users`} placement="top">
            <AntAvatar
              style={{ backgroundColor: '#52c41a', color: '#fff' }}
              size={32}
              aria-label={`${omittedCount} more users`}
            >
              +{omittedCount}
            </AntAvatar>
          </Tooltip>
        )}
      </AntAvatar.Group>
    </Spin>
  );
}
