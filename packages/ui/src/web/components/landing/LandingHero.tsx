import { ArrowUpOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';

import { QuarkTheme } from '../../lib/theme';

export interface LandingHeroProps {
  exploreUrl?: string;
  blogUrl?: string;
}

export function LandingHero({ exploreUrl, blogUrl }: LandingHeroProps) {
  return (
    <QuarkTheme>
      <section className="border-b border-slate-800">
        <div className="mx-auto flex min-h-[40vh] max-w-7xl flex-col justify-center gap-6 px-4 py-16">
          <Typography.Title
            level={1}
            className="!mb-0 max-w-3xl !text-4xl !leading-tight sm:!text-5xl"
          >
            Formal Certification and Secure Distribution for AI Skills.
          </Typography.Title>
          <Typography.Paragraph
            type="secondary"
            className="!mb-0 max-w-2xl !text-lg"
          >
            Deterministic packages evaluated with 100% coverage and immutable
            cryptographic signatures.
          </Typography.Paragraph>
          <div className="flex flex-wrap items-center gap-4">
            {exploreUrl ? (
              <Button href={exploreUrl} type="primary" size="large">
                Explore Registry
              </Button>
            ) : null}
            {blogUrl ? (
              <a
                href={blogUrl}
                className="inline-flex items-center gap-1 text-sm font-medium hover:brightness-125"
              >
                Read the Blog (.blog)
                <ArrowUpOutlined aria-hidden="true" className="text-xs" />
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </QuarkTheme>
  );
}
