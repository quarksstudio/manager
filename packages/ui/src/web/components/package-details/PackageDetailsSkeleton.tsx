import { Card, Skeleton } from 'antd';

import { QuarkTheme } from '../../lib/theme';

export function PackageDetailsSkeleton() {
  return (
    <QuarkTheme>
      <div
        data-testid="package-loading"
        className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8"
      >
        <div className="space-y-2">
          <Skeleton active title={{ width: 288 }} paragraph={false} />
          <Skeleton active title={false} paragraph={{ rows: 1, width: 384 }} />
        </div>
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton.Button active size="large" />
              <Skeleton.Button active size="large" />
              <Skeleton.Button active size="large" />
            </div>
            <Card>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          </div>
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </div>
      </div>
    </QuarkTheme>
  );
}
