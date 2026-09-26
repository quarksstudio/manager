import type { ReactNode } from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import { Button, Flex, Result } from 'antd';

import { QuarkTheme } from '../../lib/theme';

export interface PackageStateNoticeProps {
  title: string;
  description?: string;
  loading?: boolean;
  onRetry?: () => void;
  children?: ReactNode;
}

export function PackageStateNotice({
  title,
  description,
  loading,
  onRetry,
  children,
}: PackageStateNoticeProps) {
  return (
    <QuarkTheme>
      <Flex align="center" justify="center" className="py-12">
        <Result
          status="info"
          title={title}
          subTitle={description}
          extra={
            onRetry ? (
              <Button onClick={onRetry} disabled={loading}>
                <ReloadOutlined
                  aria-hidden="true"
                  spin={loading}
                  aria-label="Retry"
                />
                Retry
              </Button>
            ) : null
          }
        >
          {children}
        </Result>
      </Flex>
    </QuarkTheme>
  );
}
