import { Input } from 'antd';

import { QuarkTheme } from '../theme';
import { PropsWithChildren } from 'react';

export interface SiteNavbarProps extends PropsWithChildren {
  logo: string;
  searchAction?: string;
  searchPlaceholder?: string;
  loginUrl?: string;
}

export function SiteNavbar({
  logo,
  searchAction,
  searchPlaceholder,
  children,
}: SiteNavbarProps) {
  return (
    <QuarkTheme>
      <header
        data-slot="site-navbar"
        className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <a
            href="/"
            className="shrink-0 font-mono text-sm font-semibold tracking-tight text-slate-100"
          >
            {logo}
          </a>
          <form
            role="search"
            className="flex min-w-0 flex-1 items-center gap-2 px-16"
            action={searchAction}
            method="get"
          >
            <Input.Search
              name="q"
              type="search"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              className="flex-1 flex"
              variant="filled"
            />
          </form>
          <div className="shrink-0">{children}</div>
        </div>
      </header>
    </QuarkTheme>
  );
}
