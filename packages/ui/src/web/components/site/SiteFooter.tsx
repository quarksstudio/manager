import { Divider, Flex, Typography } from 'antd';

import { QuarkTheme } from '../../lib/theme';

export interface SiteFooterLink {
  label: string;
  href: string;
}

export interface SiteFooterProps {
  links: SiteFooterLink[];
}

export function SiteFooter({ links }: SiteFooterProps) {
  return (
    <QuarkTheme>
      <footer data-slot="site-footer" className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center">
          <Typography.Text className="font-mono" type="secondary">
            QUARK // SKILLS
          </Typography.Text>
          <Flex align="center" gap={24}>
            <Divider
              orientation="vertical"
              className="!hidden sm:!inline-block"
            />
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm transition-colors hover:text-slate-200"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </Flex>
        </div>
      </footer>
    </QuarkTheme>
  );
}
