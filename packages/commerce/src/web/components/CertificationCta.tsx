import { Button, Typography } from 'antd';

import { QuarkTheme } from '@quarks.studio/web-ui';

export interface CertificationCtaProps {
  /** Local ladder page, e.g. `/packages/demo/1.0.0/payment`. */
  href: string;
  versionId: string;
  held?: number;
}

export function CertificationCta({
  href,
  versionId,
  held = 0,
}: CertificationCtaProps) {
  return (
    <QuarkTheme>
      <div
        data-testid="certification-cta"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-5"
      >
        <div>
          <Typography.Text strong className="block">
            Certifications
          </Typography.Text>
          <Typography.Text type="secondary" className="text-sm">
            {held > 0
              ? `You already hold level ${held}. Move up whenever you want.`
              : 'Certify this version to appear in the catalog.'}
          </Typography.Text>
        </div>
        <Button type="primary" href={href}>
          See the certifications of v{versionId}
        </Button>
      </div>
    </QuarkTheme>
  );
}
