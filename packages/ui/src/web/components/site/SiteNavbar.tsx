import { SearchOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';

import { QuarkTheme } from '../../lib/theme';

export interface SiteNavbarProps {
  logo: string;
  searchAction?: string;
  searchPlaceholder?: string;
  loginUrl?: string;
}

export function SiteNavbar({
  logo,
  searchAction,
  searchPlaceholder,
  loginUrl,
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
            className="flex min-w-0 flex-1 items-center gap-2"
            action={searchAction}
            method="get"
          >
            <Input
              name="q"
              type="search"
              aria-label="Search packages and skills"
              placeholder={searchPlaceholder}
              prefix={<SearchOutlined aria-hidden="true" />}
              className="max-w-xl flex-1"
              variant="filled"
            />
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined aria-hidden="true" />}
              aria-label="Search"
            />
          </form>
          <div className="shrink-0">
            {loginUrl ? <Button href={loginUrl}>Login</Button> : null}
          </div>
        </div>
      </header>
    </QuarkTheme>
  );
}
