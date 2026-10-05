import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserProfileServices } from '../application/user-profile.port';
import type { PublicUserProfile } from '../domain/public-user-profile';
import type { RemoteSearchPage } from '@quarks.studio/package-search';

export function useUserProfile(
  username: string,
  services: UserProfileServices,
) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [page, setPage] = useState<RemoteSearchPage | null>(null);
  const [error, setError] = useState<
    'profile' | 'packages' | 'unsupported-filters' | 'not-found' | null
  >(null);
  const [loading, setLoading] = useState(true);
  const busy = useRef(false);
  const revision = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (
      busy.current ||
      error === 'not-found' ||
      (profile && page && !page.nextCursor)
    )
      return;
    busy.current = true;
    const request = ++revision.current;
    setLoading(true);
    setError(null);
    let found = profile;
    try {
      if (!found) {
        found = await services.getProfile(username);
        if (request !== revision.current) return;
        setProfile(found);
      }
      const next = await services.getPackages(
        found.id,
        page?.nextCursor ?? undefined,
      );
      if (request !== revision.current) return;
      setPage((previous) => {
        const items = new Map(
          (previous?.items ?? []).map((item) => [item.name, item]),
        );
        next.items.forEach((item) => items.set(item.name, item));
        return { ...next, items: [...items.values()] };
      });
    } catch (failure) {
      if (request !== revision.current) return;
      const status =
        typeof failure === 'object' && failure !== null && 'status' in failure
          ? failure.status
          : undefined;
      setError(
        !found
          ? status === 404
            ? 'not-found'
            : 'profile'
          : status === 400
            ? 'unsupported-filters'
            : 'packages',
      );
    } finally {
      if (request === revision.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, [error, profile, page, services, username]);

  const firstLoad = useRef(load);
  useEffect(() => {
    void firstLoad.current();
    return () => {
      revision.current += 1;
      busy.current = false;
    };
  }, []);

  useEffect(() => {
    const target = sentinel.current;
    if (
      !target ||
      !page?.nextCursor ||
      loading ||
      error ||
      typeof IntersectionObserver === 'undefined'
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void load();
      },
      { rootMargin: '0px 0px 400px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [page?.nextCursor, loading, error, load]);

  return { profile, page, error, loading, load, sentinel };
}
