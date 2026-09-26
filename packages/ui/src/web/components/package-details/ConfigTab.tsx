import type { PackageDetails } from '@quarks.studio/registry/client';
import { Alert, Button, Form, Input } from 'antd';

import { QuarkTheme } from '../../lib/theme';

export interface ConfigTabProps {
  packageName: string;
  detail: PackageDetails;
  action?: string;
  error?: string;
  draft?: { description: string; tags: string; authors: string };
}

export function ConfigTab({ detail, action, error, draft }: ConfigTabProps) {
  return (
    <QuarkTheme>
      <Form
        layout="vertical"
        name="package-metadata"
        requiredMark={false}
        method="post"
        action={action}
        className="max-w-xl"
        initialValues={{
          description: draft?.description ?? detail.description,
          tags: draft?.tags ?? detail.tags.join(', '),
          authors: draft?.authors ?? detail.authors.join(', '),
        }}
      >
        {error ? <Alert type="error" title={error} showIcon /> : null}
        <Form.Item label="Description" name="description" required>
          <Input.TextArea name="description" maxLength={500} rows={4} />
        </Form.Item>
        <Form.Item label="Tags (comma separated)" name="tags">
          <Input name="tags" />
        </Form.Item>
        <Form.Item label="Authors (comma separated)" name="authors" required>
          <Input name="authors" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" disabled={!action}>
            Save changes
          </Button>
        </Form.Item>
      </Form>
    </QuarkTheme>
  );
}
