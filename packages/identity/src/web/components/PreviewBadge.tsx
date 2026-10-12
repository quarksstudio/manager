import { Tag } from 'antd';

/** Marks fixture-backed sections so no one mistakes preview data for live. */
export function PreviewBadge() {
  return <Tag color="orange">Preview data</Tag>;
}
